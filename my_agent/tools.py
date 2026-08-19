"""Market-data tools backed by yfinance and OpenBB.

These are plain functions (type-hinted, docstrung) handed straight to ADK
`Agent(tools=[...])` lists, which wraps them as FunctionTools. Every function
returns a plain, JSON-serializable dict - including on failure, where it
returns {"error": "..."} instead of raising, so a bad ticker or a flaky
provider surfaces to the model as a normal tool result it can react to.
"""

import datetime

import numpy as np
import pandas as pd
import yfinance as yf
from openbb import obb


def _json_safe(value):
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.floating):
        return float(value)
    if isinstance(value, (pd.Timestamp, datetime.date, datetime.datetime)):
        return str(value)
    if pd.isna(value):
        return None
    return value


def _obb_records(result, n: int = 8, from_end: bool = False) -> list:
    df = result.to_df()
    if df.empty:
        return []
    if df.index.name:
        df = df.reset_index()
    df = df.tail(n) if from_end else df.head(n)
    records = df.to_dict(orient='records')
    return [{k: _json_safe(v) for k, v in row.items()} for row in records]


def get_technical_snapshot(ticker: str) -> dict:
    """Fetches recent price action and technical indicators for a stock from
    Yahoo Finance.

    Computes the latest close, 50-day and 200-day simple moving averages,
    14-day RSI, latest volume vs its 20-day average, and the 52-week
    high/low, from about a year of daily price history.

    Args:
        ticker: The stock ticker symbol, e.g. "AAPL".

    Returns:
        A dict with the computed technical snapshot, or a dict with an
        "error" key if data could not be retrieved for the ticker.
    """
    try:
        hist = yf.Ticker(ticker).history(period='1y', interval='1d', auto_adjust=True)
    except Exception as e:
        return {'error': f'Failed to fetch price history for {ticker!r}: {e}'}

    if hist.empty:
        return {'error': f'No price history found for ticker {ticker!r}.'}

    close = hist['Close']
    volume = hist['Volume']

    def sma(window):
        if len(close) < window:
            return None
        return round(float(close.tail(window).mean()), 2)

    delta = close.diff()
    avg_gain = delta.clip(lower=0).rolling(14).mean()
    avg_loss = (-delta.clip(upper=0)).rolling(14).mean()
    rsi_series = 100 - (100 / (1 + avg_gain / avg_loss))
    latest_rsi = rsi_series.iloc[-1]

    return {
        'ticker': ticker.upper(),
        'as_of': close.index[-1].date().isoformat(),
        'latest_close': round(float(close.iloc[-1]), 2),
        'sma_50': sma(50),
        'sma_200': sma(200),
        'rsi_14': round(float(latest_rsi), 2) if pd.notna(latest_rsi) else None,
        'latest_volume': int(volume.iloc[-1]),
        'avg_volume_20d': round(float(volume.tail(20).mean()), 0) if len(volume) >= 20 else None,
        '52_week_high': round(float(close.max()), 2),
        '52_week_low': round(float(close.min()), 2),
    }


def _fetch_openbb_statement(fetch_fn, ticker: str, limit: int) -> dict:
    last_error = None
    for provider in ('sec', 'yfinance'):
        try:
            records = _obb_records(fetch_fn(symbol=ticker, limit=limit, provider=provider), n=limit)
        except Exception as e:
            last_error = e
            continue
        if records:
            return {'ticker': ticker.upper(), 'provider': provider, 'periods': records}
    return {
        'error': (
            f'Failed to fetch data for {ticker!r} from SEC and Yahoo Finance'
            + (f': {last_error}' if last_error else ' (no data returned).')
        )
    }


def get_balance_sheet(ticker: str, limit: int = 4) -> dict:
    """Fetches a company's balance sheet (assets, liabilities, equity) from
    SEC filings, falling back to Yahoo Finance if SEC data is unavailable.

    Args:
        ticker: The stock ticker symbol, e.g. "AAPL".
        limit: Number of most recent annual periods to return (default 4).

    Returns:
        A dict with the ticker, provider used, and a list of period records
        (most recent first), or a dict with an "error" key on failure.
    """
    return _fetch_openbb_statement(obb.equity.fundamental.balance, ticker, limit)


def get_income_statement(ticker: str, limit: int = 4) -> dict:
    """Fetches a company's income statement (revenue, expenses, net income)
    from SEC filings, falling back to Yahoo Finance if SEC data is
    unavailable.

    Args:
        ticker: The stock ticker symbol, e.g. "AAPL".
        limit: Number of most recent annual periods to return (default 4).

    Returns:
        A dict with the ticker, provider used, and a list of period records
        (most recent first), or a dict with an "error" key on failure.
    """
    return _fetch_openbb_statement(obb.equity.fundamental.income, ticker, limit)


def get_cash_flow(ticker: str, limit: int = 4) -> dict:
    """Fetches a company's cash flow statement (operating/investing/
    financing cash flows) from SEC filings, falling back to Yahoo Finance if
    SEC data is unavailable.

    Args:
        ticker: The stock ticker symbol, e.g. "AAPL".
        limit: Number of most recent annual periods to return (default 4).

    Returns:
        A dict with the ticker, provider used, and a list of period records
        (most recent first), or a dict with an "error" key on failure.
    """
    return _fetch_openbb_statement(obb.equity.fundamental.cash, ticker, limit)


def get_valuation_metrics(ticker: str) -> dict:
    """Fetches current valuation multiples (P/E, forward P/E, PEG,
    EV/EBITDA, etc.) for a stock from Yahoo Finance via OpenBB.

    Args:
        ticker: The stock ticker symbol, e.g. "AAPL".

    Returns:
        A dict with the ticker and its current metrics, or a dict with an
        "error" key on failure.
    """
    try:
        records = _obb_records(obb.equity.fundamental.metrics(symbol=ticker, provider='yfinance'), n=1)
    except Exception as e:
        return {'error': f'Failed to fetch valuation metrics for {ticker!r}: {e}'}
    if not records:
        return {'error': f'No valuation metrics found for ticker {ticker!r}.'}
    return {'ticker': ticker.upper(), 'provider': 'yfinance', 'metrics': records[0]}


def get_analyst_estimates(ticker: str) -> dict:
    """Fetches consensus analyst price targets and recommendations for a
    stock from Yahoo Finance via OpenBB.

    Args:
        ticker: The stock ticker symbol, e.g. "AAPL".

    Returns:
        A dict with the ticker and consensus estimates, or a dict with an
        "error" key on failure.
    """
    try:
        records = _obb_records(obb.equity.estimates.consensus(symbol=ticker, provider='yfinance'), n=1)
    except Exception as e:
        return {'error': f'Failed to fetch analyst estimates for {ticker!r}: {e}'}
    if not records:
        return {'error': f'No analyst estimates found for ticker {ticker!r}.'}
    return {'ticker': ticker.upper(), 'provider': 'yfinance', 'estimates': records[0]}


def get_treasury_yields() -> dict:
    """Fetches the recent U.S. Treasury yield curve (1-month through
    30-year rates) from the Federal Reserve via OpenBB.

    Returns:
        A dict with the last 5 trading days of yield-curve data (most
        recent last), or a dict with an "error" key on failure.
    """
    try:
        records = _obb_records(
            obb.fixedincome.government.treasury_rates(provider='federal_reserve'), n=5, from_end=True
        )
    except Exception as e:
        return {'error': f'Failed to fetch treasury yields: {e}'}
    if not records:
        return {'error': 'No treasury yield data returned.'}
    return {'provider': 'federal_reserve', 'recent_yield_curve': records}
