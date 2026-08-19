import Head from "expo-router/head";
import { ScrollView, Text, View } from "react-native";

import { SiteFooter } from "@/components/SiteFooter";
import { SlotFill } from "@/components/SlotFill";
import {
  Btn,
  Chip,
  Display,
  Eyebrow,
  Grid,
  H2,
  H3,
  Prose,
  Section,
  Wrap,
} from "@/components/ui";
import { aboutStats, team, values } from "@/data/site";
import { columns, fluid, useLayout } from "@/lib/layout";

export default function About() {
  const layout = useLayout();
  const { contentWidth, isMid, width } = layout;

  return (
    <ScrollView className="flex-1 bg-blush">
      <Head>
        <title>About us — Equity Labs</title>
        <meta
          name="description"
          content="Equity Labs builds the quiet infrastructure behind private markets — a system of record where ownership, terms, and outcomes agree with each other."
        />
      </Head>

      <Wrap>
        <View style={{ paddingTop: fluid(width, 64, 104), paddingBottom: fluid(width, 44, 72) }}>
          <View className="mb-7">
            <Eyebrow>About us</Eyebrow>
          </View>
          <View style={{ maxWidth: 840 }}>
            <Display size="sm">
              We build the quiet infrastructure behind private markets.
            </Display>
          </View>
        </View>
      </Wrap>

      <Wrap>
        <View style={{ paddingBottom: fluid(width, 56, 88) }}>
          <Grid cols={isMid ? 2 : 1} gap={56} available={contentWidth}>
            <Prose>
              Equity Labs started with a spreadsheet that nobody trusted. Four tabs,
              thirty years of formulas, and a footnote explaining why the totals were
              off by six thousand shares. We rebuilt it as a system of record — one
              place where ownership, terms, and outcomes agree with each other.
            </Prose>
            <Prose>
              Today the team is a mix of fund controllers, transaction lawyers, and
              engineers. We ship for the people who sign off on the numbers, not the
              people who present them. That distinction shapes every decision on the
              roadmap.
            </Prose>
          </Grid>
        </View>
      </Wrap>

      {/* Values — inverted band */}
      <View className="bg-navy">
        <Wrap>
          <Section>
            <View className="mb-8">
              <Text className="font-mono-md text-[11px] uppercase tracking-[1.5px] text-periwinkle">
                What we hold to
              </Text>
            </View>
            <Grid cols={columns(layout, 3, 1)} gap={44} available={contentWidth}>
              {values.map((v) => (
                <View key={v.title} className="gap-3.5">
                  <View className="h-px w-full bg-indigo" />
                  <H3 className="text-blush">{v.title}</H3>
                  <Prose size={15} className="text-periwinkle">
                    {v.body}
                  </Prose>
                </View>
              ))}
            </Grid>
          </Section>
        </Wrap>
      </View>

      {/* Team */}
      <Wrap>
        <Section>
          <View className={isMid ? "flex-row gap-14" : "gap-8"}>
            <View style={{ width: isMid ? 340 : contentWidth }}>
              <H2>The team</H2>
              <View className="mt-[18px]">
                <Prose>
                  Small on purpose. Every person here has closed a round, audited one,
                  or written the software that failed to.
                </Prose>
              </View>
            </View>

            <View style={{ width: isMid ? contentWidth - 340 - 56 : contentWidth }}>
              <Grid
                cols={columns(layout, 4, 2)}
                gap={28}
                available={isMid ? contentWidth - 340 - 56 : contentWidth}
              >
                {team.map((p) => (
                  <View key={p.slot} className="gap-3.5">
                    <View
                      className="justify-end overflow-hidden rounded-xl border border-rule bg-surface p-3.5"
                      style={{ aspectRatio: 4 / 5 }}
                    >
                      <SlotFill id={p.slot} />
                      <Chip small>{p.slot}</Chip>
                    </View>
                    <View>
                      <Text className="font-sans-md text-[15px] text-navy">{p.name}</Text>
                      <Text className="mt-0.5 font-sans text-[13px] text-indigo">
                        {p.role}
                      </Text>
                    </View>
                  </View>
                ))}
              </Grid>
            </View>
          </View>
        </Section>
      </Wrap>

      {/* Stats */}
      <View className="border-t border-rule">
        <Wrap>
          <Section tight>
            <Grid cols={columns(layout, 4, 2)} gap={32} available={contentWidth}>
              {aboutStats.map((s) => (
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
              <H2>We are hiring carefully.</H2>
              <View className="mt-3.5">
                <Prose size={15}>
                  Open roles in ledger engineering, transaction counsel, and finance
                  operations. Tell us about a close that went badly and what you would
                  have changed.
                </Prose>
              </View>
            </View>
            <Btn
              label="See open roles"
              href="mailto:careers@equitylabs.example?subject=Open%20roles"
              arrow
            />
          </View>
        </Section>
      </Wrap>

      <SiteFooter />
    </ScrollView>
  );
}
