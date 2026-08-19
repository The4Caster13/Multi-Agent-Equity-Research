import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { Markdown } from "@/components/Markdown";
import { columns, useLayout } from "@/lib/layout";
import {
  type AnalystNote,
  type ProgressStep,
  type ResearchResult,
  TICKER_RE,
  agentLabel,
  normalizeTicker,
  runResearch,
  stanceLabel,
} from "@/lib/research";
import { Grid } from "@/components/ui";
import { palette } from "@/theme";

const EXAMPLES = ["AAPL", "MSFT", "NVDA", "JPM"];

/** Confidence and agreement are magnitudes, so a single-hue bar is the right mark. */
function Meter({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View className="h-1.5 w-full overflow-hidden rounded-full bg-rule-faint">
      <View className="h-full rounded-full bg-navy" style={{ width: `${pct}%` }} />
    </View>
  );
}

function Label({ children }: { children: string }) {
  return (
    <Text className="font-mono-md text-[10px] uppercase tracking-[0.9px] text-indigo">
      {children}
    </Text>
  );
}

function NoteCard({ note }: { note: AnalystNote }) {
  return (
    <View className="gap-3 rounded-xl border border-rule bg-blush p-5">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="font-sans-md text-[14px] text-navy">
          {agentLabel(note.agent)}
        </Text>
        <View className="rounded-full border border-rule bg-surface px-2.5 py-1">
          <Text className="font-mono text-[10px] uppercase tracking-[0.6px] text-navy">
            {stanceLabel(note.stance)}
          </Text>
        </View>
      </View>

      <View className="gap-1.5">
        <View className="flex-row items-center justify-between">
          <Label>Confidence</Label>
          <Text className="font-mono text-[11px] text-indigo">
            {Math.round((note.confidence ?? 0) * 100)}%
          </Text>
        </View>
        <Meter value={note.confidence ?? 0} />
      </View>

      <Text className="font-sans text-[14px] leading-[23px] text-indigo">
        {note.summary}
      </Text>

      {note.key_points?.length ? (
        <View className="gap-1.5">
          <Label>Key points</Label>
          {note.key_points.map((point, i) => (
            <View key={i} className="flex-row gap-2">
              <Text className="font-sans text-[13px] leading-[21px] text-periwinkle">—</Text>
              <Text className="flex-1 font-sans text-[13px] leading-[21px] text-indigo">
                {point}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {note.data_gaps?.length ? (
        <View className="gap-1.5 border-t border-rule pt-3">
          <Label>Data gaps</Label>
          {note.data_gaps.map((gap, i) => (
            <Text key={i} className="font-sans text-[13px] leading-[21px] text-indigo">
              {gap}
            </Text>
          ))}
        </View>
      ) : null}

      {note.as_of ? (
        <Text className="font-mono text-[11px] text-indigo">as of {note.as_of}</Text>
      ) : null}
    </View>
  );
}

export function ResearchConsole() {
  const layout = useLayout();
  const { contentWidth, isMid } = layout;

  const [ticker, setTicker] = useState("");
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  const valid = TICKER_RE.test(normalizeTicker(ticker));

  useEffect(() => () => cancelRef.current?.(), []);

  const start = (symbol?: string) => {
    const target = normalizeTicker(symbol ?? ticker);
    if (!TICKER_RE.test(target) || running) return;

    setTicker(target);
    setRunning(true);
    setSteps([]);
    setResult(null);
    setError(null);

    cancelRef.current = runResearch(target, {
      onStatus: (step) => setSteps((prev) => [...prev, step]),
      onDone: (res) => {
        setResult(res);
        setRunning(false);
      },
      onError: (message) => {
        setError(message);
        setRunning(false);
      },
    });
  };

  const stop = () => {
    cancelRef.current?.();
    setRunning(false);
    setSteps([]);
  };

  const consensus = result?.consensus ?? null;
  const recent = steps.slice(-6);

  return (
    <View className="overflow-hidden rounded-[14px] border border-rule bg-surface">
      {/* Input */}
      <View className="gap-4 border-b border-rule-faint p-7">
        <View>
          <Text className="font-sans-md text-[15px] text-navy">
            Run an equity research report
          </Text>
          <Text className="mt-1.5 font-sans text-[13px] leading-[20px] text-indigo">
            Four analyst agents cover the balance sheet, valuation,
            technicals, and rates. A reviewing VP reconciles their notes
            before anything is drafted.
          </Text>
        </View>

        <View className={isMid ? "flex-row items-center gap-3" : "gap-3"}>
          <TextInput
            value={ticker}
            onChangeText={(v) => setTicker(v.toUpperCase())}
            onSubmitEditing={() => start()}
            editable={!running}
            placeholder="Ticker, e.g. AAPL"
            placeholderTextColor={palette.periwinkle}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            accessibilityLabel="Stock ticker symbol"
            className="rounded-full border border-rule bg-blush px-5 py-3 font-mono text-[14px] text-navy"
            style={{ flex: isMid ? 1 : undefined, outlineWidth: 0 } as never}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={running ? "Stop the run" : "Run research"}
            onPress={() => (running ? stop() : start())}
            disabled={!running && !valid}
            className={`flex-row items-center justify-center gap-2 rounded-full px-6 py-3 ${
              running ? "bg-indigo" : valid ? "bg-navy" : "bg-periwinkle"
            }`}
          >
            {running ? <ActivityIndicator size="small" color={palette.blush} /> : null}
            <Text className="font-sans-md text-[13px] text-blush">
              {running ? "Stop" : "Run research"}
            </Text>
          </Pressable>
        </View>

        {!running && !result ? (
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="font-mono text-[11px] text-indigo">Try</Text>
            {EXAMPLES.map((sym) => (
              <Pressable
                key={sym}
                accessibilityRole="button"
                accessibilityLabel={`Run research on ${sym}`}
                onPress={() => start(sym)}
                className="rounded-full border border-rule px-3 py-1.5"
              >
                <Text className="font-mono text-[11px] text-navy">{sym}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {/* Progress */}
      {running ? (
        <View className="gap-2.5 border-b border-rule-faint bg-blush px-7 py-6">
          <Label>Working</Label>
          {recent.map((step, i) => {
            const isLast = i === recent.length - 1;
            return (
              <View key={`${step.agent}-${i}`} className="flex-row items-center gap-2.5">
                <View
                  className={`h-1.5 w-1.5 rounded-full ${
                    isLast ? "bg-navy" : "bg-periwinkle"
                  }`}
                />
                <Text
                  className={`font-sans text-[13px] ${
                    isLast ? "text-navy" : "text-indigo"
                  }`}
                >
                  {step.label}
                  {step.detail ? (
                    <Text className="font-mono text-[12px] text-indigo">
                      {"  "}
                      {step.detail}
                    </Text>
                  ) : null}
                </Text>
              </View>
            );
          })}
          <Text className="mt-1 font-mono text-[11px] text-indigo">
            A full run takes a few minutes.
          </Text>
        </View>
      ) : null}

      {/* Error */}
      {error ? (
        <View className="gap-2 border-b border-rule-faint bg-blush px-7 py-6">
          <Label>Run failed</Label>
          <Text className="font-sans text-[14px] leading-[22px] text-navy">{error}</Text>
        </View>
      ) : null}

      {/* Result */}
      {result ? (
        <View className="gap-7 p-7">
          <View
            className={
              isMid
                ? "flex-row items-end justify-between gap-4"
                : "gap-3"
            }
          >
            <View>
              <Label>Report</Label>
              <Text className="mt-1 font-display text-[34px] leading-[38px] text-navy">
                {result.ticker}
              </Text>
            </View>
            <Text className="font-mono text-[11px] text-indigo">
              {result.generatedAt.replace("T", " ").replace("Z", " UTC")} ·{" "}
              {result.elapsedSeconds}s
            </Text>
          </View>

          {consensus ? (
            <View className="gap-4 rounded-xl border border-rule bg-blush p-5">
              <View className={isMid ? "flex-row gap-8" : "gap-4"}>
                <View className="gap-1.5" style={{ flex: 1 }}>
                  <Label>Overall stance</Label>
                  <Text className="font-sans-md text-[15px] text-navy">
                    {stanceLabel(consensus.overall_stance)}
                  </Text>
                </View>
                <View className="gap-1.5" style={{ flex: 1 }}>
                  <View className="flex-row items-center justify-between">
                    <Label>Analyst agreement</Label>
                    <Text className="font-mono text-[11px] text-indigo">
                      {Math.round((consensus.agreement_score ?? 0) * 100)}%
                    </Text>
                  </View>
                  <Meter value={consensus.agreement_score ?? 0} />
                </View>
                <View className="gap-1.5" style={{ flex: 1 }}>
                  <Label>VP review</Label>
                  <Text className="font-sans-md text-[15px] text-navy">
                    {consensus.approved ? "Approved" : "Sent back for revision"}
                  </Text>
                </View>
              </View>

              {consensus.conflicts?.length ? (
                <View className="gap-1.5 border-t border-rule pt-4">
                  <Label>Conflicts the VP flagged</Label>
                  {consensus.conflicts.map((c, i) => (
                    <View key={i} className="flex-row gap-2">
                      <Text className="font-sans text-[13px] leading-[21px] text-periwinkle">
                        —
                      </Text>
                      <Text className="flex-1 font-sans text-[13px] leading-[21px] text-indigo">
                        {c}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {result.report ? <Markdown source={result.report} /> : null}

          {consensus?.notes?.length ? (
            <View className="gap-4 border-t border-rule pt-7">
              <Text className="font-sans-md text-[15px] text-navy">Analyst notes</Text>
              <Grid
                cols={columns(layout, 2, 1)}
                gap={16}
                available={contentWidth - 56}
              >
                {consensus.notes.map((note) => (
                  <NoteCard key={note.agent} note={note} />
                ))}
              </Grid>
            </View>
          ) : null}

          <Text className="font-mono text-[11px] leading-[18px] text-indigo">
            Generated by a language model from public market data. Not investment
            advice.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
