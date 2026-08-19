import { Platform } from "react-native";

/**
 * Client for the `my_agent` research service (see service/main.py).
 *
 * On web it streams progress over SSE, because a full run fans out across six
 * analyst agents and takes minutes. Everywhere else it falls back to the
 * blocking POST — React Native has no EventSource.
 */

export type Stance = "bullish" | "neutral" | "bearish" | "not_applicable";

export type AnalystNote = {
  agent: string;
  stance: Stance;
  confidence: number;
  summary: string;
  key_points: string[];
  data_gaps?: string[];
  as_of?: string | null;
};

export type ConsensusReport = {
  overall_stance: Stance;
  agreement_score: number;
  notes: AnalystNote[];
  conflicts?: string[];
  revision_requests?: string[];
  approved: boolean;
};

export type ResearchResult = {
  ticker: string;
  report: string;
  consensus: ConsensusReport | null;
  elapsedSeconds: number;
  generatedAt: string;
};

export type ProgressStep = {
  agent: string;
  label: string;
  detail?: string | null;
};

export type Handlers = {
  onStatus?: (step: ProgressStep) => void;
  onDone: (result: ResearchResult) => void;
  onError: (message: string) => void;
};

/**
 * In production Express proxies the service under /api on the same origin.
 * In dev the Expo server is on :8081 and the agent on :8000, so point straight
 * at it. `EXPO_PUBLIC_RESEARCH_API` overrides both.
 */
export function apiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_RESEARCH_API;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (Platform.OS === "web" && !__DEV__) return "/api";
  return "http://localhost:8000";
}

export const TICKER_RE = /^[A-Za-z][A-Za-z.\-]{0,9}$/;

export function normalizeTicker(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Kicks off a run. Returns a cancel function. */
export function runResearch(ticker: string, handlers: Handlers): () => void {
  const symbol = normalizeTicker(ticker);
  const base = apiBase();

  const canStream =
    Platform.OS === "web" && typeof globalThis.EventSource !== "undefined";

  if (canStream) {
    const source = new EventSource(
      `${base}/research/stream?ticker=${encodeURIComponent(symbol)}`
    );
    let settled = false;

    source.onmessage = (e: MessageEvent) => {
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(e.data);
      } catch {
        return;
      }

      if (payload.type === "status") {
        handlers.onStatus?.({
          agent: String(payload.agent ?? ""),
          label: String(payload.label ?? ""),
          detail: (payload.detail as string | null) ?? null,
        });
      } else if (payload.type === "done") {
        settled = true;
        source.close();
        handlers.onDone(payload.result as ResearchResult);
      } else if (payload.type === "error") {
        settled = true;
        source.close();
        handlers.onError(String(payload.message ?? "The agent run failed."));
      }
    };

    source.onerror = () => {
      if (settled) return;
      settled = true;
      source.close();
      handlers.onError(
        `Could not reach the research service at ${base}. Start it with \`npm run agent\`.`
      );
    };

    return () => {
      settled = true;
      source.close();
    };
  }

  // Blocking fallback.
  const controller = new AbortController();
  fetch(`${base}/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker: symbol }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || `HTTP ${res.status}`);
      }
      return res.json();
    })
    .then((result: ResearchResult) => handlers.onDone(result))
    .catch((err: unknown) => {
      if (controller.signal.aborted) return;
      handlers.onError(
        err instanceof Error ? err.message : "The agent run failed."
      );
    });

  return () => controller.abort();
}

export function stanceLabel(stance: Stance): string {
  switch (stance) {
    case "bullish":
      return "Bullish";
    case "bearish":
      return "Bearish";
    case "neutral":
      return "Neutral";
    default:
      return "No directional read";
  }
}

export function agentLabel(agent: string): string {
  return agent
    .replace(/_agent$/, "")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}
