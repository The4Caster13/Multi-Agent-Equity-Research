import Head from "expo-router/head";
import { ScrollView, Text, View } from "react-native";

import { DataDisclosure, DataTable, Figure } from "@/components/Figure";
import { DistributionChart } from "@/components/DistributionChart";
import { OwnershipLedger } from "@/components/OwnershipLedger";
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
import { distribution, stats, steps } from "@/data/site";
import { columns, fluid, useLayout } from "@/lib/layout";
import { palette } from "@/theme";

const TOTAL = distribution.reduce((sum, d) => sum + d.value, 0);

export default function HowItWorks() {
  const layout = useLayout();
  const { contentWidth, isMid, width } = layout;
  const sidebar = isMid ? 340 : contentWidth;
  const rest = isMid ? contentWidth - sidebar - 56 : contentWidth;

  return (
    <ScrollView className="flex-1 bg-blush">
      <Head>
        <title>Equity Labs — Cap table math, settled before the round closes</title>
        <meta
          name="description"
          content="Equity Labs turns signed documents into a cap table, a waterfall, and a distribution every stakeholder can audit. Three steps from term sheet to statement."
        />
      </Head>

      {/* Hero */}
      <Wrap>
        <View style={{ paddingTop: fluid(width, 64, 104), paddingBottom: fluid(width, 56, 88) }}>
          <View className="mb-7">
            <Eyebrow>How it works</Eyebrow>
          </View>
          <View style={{ maxWidth: 820 }}>
            <Display>Cap table math, settled before the round closes.</Display>
          </View>
          <View className="mt-7" style={{ maxWidth: 560 }}>
            <Lede>
              Three steps from a signed term sheet to a distribution every stakeholder
              can audit.
            </Lede>
          </View>
          <View className="mt-9 flex-row flex-wrap gap-3">
            <Btn label="Scenario modeling" href="/feature" arrow />
            <Btn label="About us" href="/about" variant="ghost" />
          </View>
        </View>
      </Wrap>

      {/* Steps */}
      <View className="border-y border-rule bg-surface">
        <Wrap>
          <View className={isMid ? "flex-row" : ""}>
            {steps.map((s, i) => {
              const last = i === steps.length - 1;
              return (
                <View
                  key={s.n}
                  style={
                    isMid
                      ? {
                          width: contentWidth / 3,
                          paddingTop: 56,
                          paddingBottom: 64,
                          paddingLeft: i === 0 ? 0 : 40,
                          paddingRight: last ? 0 : 40,
                          borderRightWidth: last ? 0 : 1,
                          borderColor: palette.periwinkle,
                        }
                      : {
                          paddingVertical: 36,
                          borderBottomWidth: last ? 0 : 1,
                          borderColor: palette.periwinkle,
                        }
                  }
                >
                  <View className="h-[34px] w-[34px] items-center justify-center rounded-full border border-rule bg-blush">
                    <Text className="font-mono-md text-[12px] text-navy">{s.n}</Text>
                  </View>
                  <View className="mt-[18px]">
                    <H3>{s.title}</H3>
                  </View>
                  <View className="mt-[18px]">
                    <Prose size={15}>{s.body}</Prose>
                  </View>
                </View>
              );
            })}
          </View>
        </Wrap>
      </View>

      {/* Inside the model */}
      <Wrap>
        <Section>
          <View className={isMid ? "flex-row gap-14" : "gap-8"}>
            <View style={{ width: sidebar }}>
              <H2>Inside the model</H2>
              <View className="mt-[18px]">
                <Prose>
                  Every waterfall is versioned, diffable, and traceable back to the
                  document it came from. Change one term and the distribution
                  recalculates in front of you — with the prior version still on record.
                </Prose>
              </View>
              <View className="mt-7">
                <Btn label="Explore scenarios" href="/feature" variant="ghost" arrow />
              </View>
            </View>

            <View style={{ width: rest }} className="gap-6">
              <Figure
                title="Distribution by holder — $180M exit"
                subtitle="Illustrative waterfall for a Series B company. Proceeds after a $120M preference stack clears."
                footer={
                  <DataDisclosure>
                    <DataTable
                      head={["Holder", "Proceeds", "Share"]}
                      rows={[
                        ...distribution.map((d) => [
                          d.holder,
                          `$${d.value.toFixed(1)}M`,
                          `${d.share}%`,
                        ]),
                        ["Total", `$${TOTAL.toFixed(1)}M`, "100%"],
                      ]}
                    />
                  </DataDisclosure>
                }
              >
                <DistributionChart />
              </Figure>

              <Figure
                title="Fully diluted ownership"
                subtitle="As reconciled from 14 source documents · last verified 12 Jun 2026"
                bodyPadding={28}
              >
                <OwnershipLedger />
              </Figure>
            </View>
          </View>
        </Section>
      </Wrap>

      {/* Stats */}
      <View className="border-t border-rule">
        <Wrap>
          <Section tight>
            <Grid cols={columns(layout, 4, 2)} gap={32} available={contentWidth}>
              {stats.map((s) => (
                <View key={s.k} className="gap-2.5">
                  <Text
                    className="font-display text-navy"
                    style={{ fontSize: fluid(width, 32, 40), letterSpacing: -0.8 }}
                  >
                    {s.v}
                  </Text>
                  <Prose size={13}>{s.k}</Prose>
                </View>
              ))}
            </Grid>
          </Section>
        </Wrap>
      </View>

      {/* CTA */}
      <Wrap>
        <Section>
          <View
            className={`rounded-[14px] border border-rule bg-surface ${
              isMid ? "flex-row items-center justify-between gap-8" : "gap-8"
            }`}
            style={{ padding: fluid(width, 32, 64) }}
          >
            <View style={{ maxWidth: 440 }}>
              <H2>Close the round on numbers that agree.</H2>
              <View className="mt-3.5">
                <Prose size={15}>
                  We onboard a handful of funds and operating companies each quarter,
                  starting with a read-only reconciliation of your current cap table.
                </Prose>
              </View>
            </View>
            <Btn
              label="Request access"
              href="mailto:access@equitylabs.example?subject=Request%20access"
              arrow
            />
          </View>
        </Section>
      </Wrap>

      <SiteFooter />
    </ScrollView>
  );
}
