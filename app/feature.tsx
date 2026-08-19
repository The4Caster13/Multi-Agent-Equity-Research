import Head from "expo-router/head";
import { ScrollView, View } from "react-native";

import { DataDisclosure, DataTable, Figure } from "@/components/Figure";
import { PayoutChart } from "@/components/PayoutChart";
import { ResearchConsole } from "@/components/ResearchConsole";
import { SiteFooter } from "@/components/SiteFooter";
import {
  Btn,
  Display,
  Eyebrow,
  Grid,
  H2,
  H3,
  Lede,
  Prose,
  Section,
  Wrap,
} from "@/components/ui";
import { awkwardQuestions, payoutCurve, scenarioNotes } from "@/data/site";
import { columns, fluid, useLayout } from "@/lib/layout";
import { palette } from "@/theme";

export default function Feature() {
  const layout = useLayout();
  const { contentWidth, isMid, width } = layout;

  return (
    <ScrollView className="flex-1 bg-blush">
      <Head>
        <title>Scenario modeling — Equity Labs</title>
        <meta
          name="description"
          content="Move one term and watch every holder's outcome move with it. Scenario modeling in Equity Labs is versioned, diffable, and traceable to the source document."
        />
      </Head>

      <Wrap>
        <View style={{ paddingTop: fluid(width, 64, 104), paddingBottom: fluid(width, 32, 48) }}>
          <View className="mb-7">
            <Eyebrow>Feature</Eyebrow>
          </View>
          <Display size="sm">Equity research, on demand.</Display>
          <View className="mt-6" style={{ maxWidth: 560 }}>
            <Lede>
              Type a ticker. Four analyst agents go and read the filings, the tape,
              and the rate backdrop — and a reviewing VP reconciles them
              before a word is drafted.
            </Lede>
          </View>
        </View>
      </Wrap>

      {/* The agent console */}
      <Wrap>
        <View style={{ paddingBottom: fluid(width, 56, 88) }}>
          <ResearchConsole />
        </View>
      </Wrap>

      {/* Scenario modeling */}
      <View className="border-t border-rule">
        <Wrap>
          <View style={{ paddingTop: fluid(width, 56, 88), paddingBottom: fluid(width, 32, 44) }}>
            <View className="mb-7">
              <Eyebrow>Also in the product</Eyebrow>
            </View>
            <Display size="sm">Scenario modeling</Display>
            <View className="mt-6" style={{ maxWidth: 520 }}>
              <Lede>
                Move one term and watch every holder&apos;s outcome move with it — with
                the version you started from still on record.
              </Lede>
            </View>
          </View>
        </Wrap>
      </View>

      <Wrap>
        <View style={{ paddingBottom: fluid(width, 56, 88) }}>
          <Figure
            title="Common payout across exit values"
            subtitle="Same cap table, exit value swept from $0 to $400M. Common sees nothing until the $120M preference stack clears, then takes 57 cents of every additional dollar."
            footer={
              <DataDisclosure>
                <DataTable
                  head={["Exit value", "To preferred", "To common"]}
                  rows={payoutCurve.map((p) => [
                    `$${p.exit}M`,
                    `$${p.toPreferred.toFixed(1)}M`,
                    `$${p.toCommon.toFixed(1)}M`,
                  ])}
                />
              </DataDisclosure>
            }
          >
            <PayoutChart />
          </Figure>
        </View>
      </Wrap>

      {/* What a scenario carries */}
      <View className="border-y border-rule bg-surface">
        <Wrap>
          <Section>
            <View style={{ maxWidth: 620, marginBottom: fluid(width, 36, 52) }}>
              <H2>What a scenario carries</H2>
              <View className="mt-[18px]">
                <Prose>
                  A scenario is not a copy of the spreadsheet. It is a set of overrides
                  on the reconciled cap table, so the base never drifts and the diff is
                  always readable.
                </Prose>
              </View>
            </View>

            <Grid cols={columns(layout, 3, 1)} gap={36} available={contentWidth}>
              {scenarioNotes.map((n) => (
                <View
                  key={n.title}
                  className="gap-2.5 pt-[18px]"
                  style={{ borderTopWidth: 1, borderColor: palette.periwinkle }}
                >
                  <Prose size={15} className="font-sans-md text-navy">
                    {n.title}
                  </Prose>
                  <Prose size={14}>{n.body}</Prose>
                </View>
              ))}
            </Grid>
          </Section>
        </Wrap>
      </View>

      {/* Awkward questions */}
      <Wrap>
        <Section>
          <View className={isMid ? "flex-row gap-14" : "gap-8"}>
            <View style={{ width: isMid ? 340 : contentWidth }}>
              <H2>Built for the awkward questions</H2>
              <View className="mt-[18px]">
                <Prose>
                  The ones that arrive at 9pm the night before a board meeting, phrased
                  as &ldquo;what if.&rdquo;
                </Prose>
              </View>
            </View>

            <View style={{ width: isMid ? contentWidth - 340 - 56 : contentWidth }}>
              {awkwardQuestions.map((q) => (
                <View
                  key={q.title}
                  className="py-8"
                  style={{ borderTopWidth: 1, borderColor: palette.periwinkle }}
                >
                  <H3>{q.title}</H3>
                  <View className="mt-3.5">
                    <Prose size={15}>{q.body}</Prose>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </Section>
      </Wrap>

      {/* CTA */}
      <Wrap>
        <View style={{ paddingBottom: fluid(width, 56, 88) }}>
          <View
            className={`rounded-[14px] border border-rule bg-surface ${
              isMid ? "flex-row items-center justify-between gap-8" : "gap-8"
            }`}
            style={{ padding: fluid(width, 32, 64) }}
          >
            <View style={{ maxWidth: 440 }}>
              <H2>Run your own numbers.</H2>
              <View className="mt-3.5">
                <Prose size={15}>
                  Send us a term sheet and a cap table. We will come back with a
                  reconciled model and three scenarios you did not ask for.
                </Prose>
              </View>
            </View>
            <Btn
              label="Request access"
              href="mailto:access@equitylabs.example?subject=Request%20access"
              arrow
            />
          </View>
        </View>
      </Wrap>

      <SiteFooter />
    </ScrollView>
  );
}
