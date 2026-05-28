import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { colors, spacing } from "@/lib/theme";
import { useAuditions } from "@/hooks/use-data";
import { useEarnings, type EarningsRange } from "@/hooks/use-earnings";
import {
  formatPay,
  formatPayCompact,
  parsePay,
  isActiveAudition,
  currencySymbol,
} from "@/lib/format";
import type { Audition } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EarningsTab = "overview" | "goal" | "tax";
const RANGES: EarningsRange[] = ["3M", "6M", "YTD"];

// ---------------------------------------------------------------------------
// Stat Cell
// ---------------------------------------------------------------------------

function StatCell({
  n,
  label,
  tone,
}: {
  n: string;
  label: string;
  tone?: "green" | "red" | "amber";
}) {
  const toneColor =
    tone === "green"
      ? colors.green
      : tone === "red"
        ? colors.red
        : tone === "amber"
          ? colors.amber
          : colors.paper;

  return (
    <View style={s.statCell}>
      <Text style={[s.statValue, { color: toneColor }]}>{n}</Text>
      <Text style={s.statLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Goal Ring (simple text representation -- SVG via react-native-svg later)
// ---------------------------------------------------------------------------

function GoalRing({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(1, pct));
  const pctDisplay = Math.round(clamped * 100);
  return (
    <View style={s.goalRing}>
      <Text style={s.goalRingPct}>{pctDisplay}%</Text>
      <Text style={s.goalRingLabel}>TO GOAL</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Earnings Screen
// ---------------------------------------------------------------------------

export default function EarningsScreen() {
  const { auditions, loading } = useAuditions();
  const [range, setRange] = useState<EarningsRange>("6M");
  const [tab, setTab] = useState<EarningsTab>("overview");

  const { buckets, banked, potential, deltaPct, stats, breakdown, monthLabel } = useEarnings(
    auditions,
    range
  );

  // Goal mode data
  const yearlyGoal = 0; // Will come from profile
  const yearBanked = auditions
    .filter(
      (a) =>
        a.status === "booked" &&
        new Date(a.shoot_date || a.created_at).getFullYear() === new Date().getFullYear()
    )
    .reduce((sum, a) => sum + parsePay(a.compensation), 0);
  const goalPct = yearlyGoal > 0 ? yearBanked / yearlyGoal : 0;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.screenContent}>
      {/* Tab pills */}
      <View style={s.tabRow}>
        {(
          [
            { id: "overview" as const, label: "Overview" },
            { id: "goal" as const, label: "Goal" },
            { id: "tax" as const, label: "Tax" },
          ]
        ).map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[
              s.tabPill,
              tab === t.id && s.tabPillActive,
              tab === t.id && t.id === "goal" && { backgroundColor: colors.green },
              tab === t.id && t.id === "tax" && { backgroundColor: colors.amber },
            ]}
            onPress={() => setTab(t.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                s.tabPillText,
                tab === t.id && s.tabPillTextActive,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Range pills (overview only) */}
        {tab === "overview" && (
          <View style={s.rangePills}>
            {RANGES.map((r) => (
              <TouchableOpacity
                key={r}
                style={[s.rangePill, range === r && s.rangePillActive]}
                onPress={() => setRange(r)}
                activeOpacity={0.7}
              >
                <Text style={[s.rangePillText, range === r && s.rangePillTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.amber} style={{ marginTop: 60 }} />
      ) : tab === "tax" ? (
        /* Tax placeholder */
        <View style={s.placeholderContainer}>
          <Text style={s.placeholderTitle}>Tax Keeper</Text>
          <Text style={s.placeholderText}>
            Configure your tax jurisdiction and filing status in Settings.
            Tax estimates will appear here based on your booked earnings.
          </Text>
        </View>
      ) : tab === "goal" ? (
        /* Goal mode */
        <View style={{ marginTop: 24 }}>
          <Text style={s.goalHeadline}>
            Hit {yearlyGoal > 0 ? formatPayCompact(yearlyGoal) : "your goal"} by Dec 31.
          </Text>
          <GoalRing pct={goalPct} />
          <Text style={s.goalSubtext}>
            {formatPay(yearBanked)} banked \u00B7 {Math.round(goalPct * 100)}% of goal
          </Text>
          <View style={s.statRow}>
            <StatCell
              n={formatPayCompact(
                Math.round(yearBanked / (new Date().getMonth() + 1))
              )}
              label="Avg / month"
            />
            <StatCell
              n={yearlyGoal > 0 ? formatPayCompact(Math.round(yearlyGoal / 12)) : "--"}
              label="Target / month"
            />
          </View>
          <View style={s.statRow}>
            <StatCell
              n={String(auditions.filter((a) => a.status === "booked").length)}
              label="Booked"
              tone="green"
            />
            <StatCell
              n={`${
                auditions.length
                  ? Math.round(
                      (auditions.filter((a) => a.status === "booked").length / auditions.length) *
                        100
                    )
                  : 0
              }%`}
              label="Book rate"
            />
          </View>
          {yearlyGoal === 0 && (
            <Text style={s.goalHint}>
              Set a yearly goal in settings to track your pace.
            </Text>
          )}
        </View>
      ) : (
        /* Overview */
        <>
          {/* Big number */}
          <View style={{ marginTop: 20 }}>
            <Text style={s.overviewLabel}>
              {monthLabel.toUpperCase()} \u00B7 BANKED
            </Text>
            <View style={s.bigNumberRow}>
              <Text style={s.bigNumberSymbol}>{currencySymbol()}</Text>
              <Text style={s.bigNumber}>{banked.toLocaleString("en-US")}</Text>
            </View>
            <Text style={s.overviewSub}>
              {deltaPct !== null && (
                <Text style={{ color: deltaPct >= 0 ? colors.green : colors.red }}>
                  {deltaPct >= 0 ? "\u2191" : "\u2193"} {Math.abs(deltaPct)}%
                </Text>
              )}
              {deltaPct !== null && " on last month \u00B7 "}
              <Text style={{ color: colors.paperFaint }}>
                {formatPayCompact(potential)} still in play
              </Text>
            </Text>
          </View>

          {/* Stats strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.statStrip}
            contentContainerStyle={s.statStripContent}
          >
            <StatCell n={String(stats.bookedCount)} label="Booked" tone="green" />
            <StatCell n={String(stats.pendingCount)} label="Pending" />
            <StatCell n={String(stats.passedCount)} label="Passed" tone="red" />
            <StatCell n={formatPayCompact(stats.otTotal)} label="OT" tone="amber" />
          </ScrollView>

          {/* Month buckets */}
          <View style={{ marginTop: 14 }}>
            <View style={s.monthStripHeader}>
              <Text style={s.sectionLabel}>BY MONTH</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.monthStripContent}
            >
              {buckets.map((b) => (
                <View
                  key={b.key}
                  style={[s.monthCard, b.isCurrent && s.monthCardCurrent]}
                >
                  <View style={s.monthCardHeader}>
                    <Text style={s.monthName}>{b.name}</Text>
                    <Text style={s.monthYear}>{b.year}</Text>
                  </View>
                  <Text style={s.monthBanked}>{formatPay(b.banked)}</Text>
                  {/* Progress bar */}
                  <View style={s.monthBar}>
                    <View
                      style={[
                        s.monthBarFill,
                        {
                          width: `${
                            b.banked + b.potential > 0
                              ? Math.round((b.banked / (b.banked + b.potential)) * 100)
                              : 0
                          }%`,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      s.monthDelta,
                      b.deltaPct !== null && b.deltaPct >= 0
                        ? { color: colors.green }
                        : b.deltaPct !== null
                          ? { color: colors.red }
                          : {},
                    ]}
                  >
                    {b.deltaPct === null
                      ? "--"
                      : `${b.deltaPct >= 0 ? "\u2191" : "\u2193"} ${Math.abs(b.deltaPct)}%`}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Breakdown */}
          <View style={s.breakdownCard}>
            <View style={s.breakdownHeader}>
              <Text style={s.breakdownTitle}>{monthLabel} \u00B7 breakdown</Text>
              <Text style={s.breakdownCount}>
                {breakdown.length} {breakdown.length === 1 ? "project" : "projects"}
              </Text>
            </View>
            {breakdown.length === 0 ? (
              <Text style={s.breakdownEmpty}>No projects this month yet.</Text>
            ) : (
              breakdown.map(({ audition: a, pay }) => (
                <View key={a.id} style={s.breakdownRow}>
                  <View style={s.breakdownRowBody}>
                    <Text
                      style={[
                        s.breakdownProject,
                        (a.status === "passed" || a.status === "archived") && {
                          color: colors.paperFaint,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {a.project_name}
                    </Text>
                    <Text style={s.breakdownRole}>{a.role_name || a.status}</Text>
                  </View>
                  <View style={s.breakdownRowRight}>
                    <Text
                      style={[
                        s.breakdownPay,
                        a.status === "booked" && { color: colors.green },
                        a.status === "passed" && {
                          color: colors.red,
                          textDecorationLine: "line-through",
                        },
                      ]}
                    >
                      {pay > 0 ? formatPay(pay) : "--"}
                    </Text>
                    <Text style={s.breakdownStatus}>{a.status.toUpperCase()}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  screenContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 60,
  },
  // Tabs
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  tabPill: {
    borderRadius: spacing.pillRadius,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tabPillActive: {
    backgroundColor: colors.paper,
  },
  tabPillText: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    letterSpacing: 1,
    color: colors.paperDim,
    textTransform: "uppercase",
  },
  tabPillTextActive: {
    color: colors.bg,
  },
  rangePills: {
    flexDirection: "row",
    marginLeft: "auto",
    gap: 2,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: spacing.pillRadius,
    padding: 3,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  rangePill: {
    borderRadius: spacing.pillRadius,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  rangePillActive: {
    backgroundColor: colors.paper,
  },
  rangePillText: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    letterSpacing: 1,
    color: colors.paperDim,
    textTransform: "uppercase",
  },
  rangePillTextActive: {
    color: colors.bg,
  },
  // Overview
  overviewLabel: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    letterSpacing: 2,
    color: colors.paperFaint,
  },
  bigNumberRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 6,
  },
  bigNumberSymbol: {
    fontSize: 34,
    color: colors.paperFaint,
    marginRight: 6,
  },
  bigNumber: {
    fontSize: 64,
    lineHeight: 64,
    letterSpacing: -1.3,
    color: colors.green,
  },
  overviewSub: {
    fontFamily: "SpaceMono",
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.paperDim,
    marginTop: 8,
  },
  // Stat strip
  statStrip: {
    marginTop: 14,
    marginHorizontal: -spacing.screenPadding,
  },
  statStripContent: {
    paddingHorizontal: spacing.screenPadding,
    gap: 8,
  },
  statCell: {
    minWidth: 110,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.018)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 22,
    color: colors.paper,
  },
  statLabel: {
    fontFamily: "SpaceMono",
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.paperFaint,
    marginTop: 6,
  },
  // Month strip
  monthStripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    letterSpacing: 2,
    color: colors.paperFaint,
  },
  monthStripContent: {
    gap: 10,
    paddingBottom: 4,
  },
  monthCard: {
    width: 128,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
    padding: 14,
    gap: 8,
  },
  monthCardCurrent: {
    borderColor: colors.green + "55",
    backgroundColor: colors.green + "0C",
  },
  monthCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  monthName: {
    fontSize: 20,
    color: colors.paper,
  },
  monthYear: {
    fontFamily: "SpaceMono",
    fontSize: 9,
    letterSpacing: 1.4,
    color: colors.paperFaint,
  },
  monthBanked: {
    fontFamily: "SpaceMono",
    fontSize: 12.5,
    letterSpacing: 0.2,
    color: colors.paper,
  },
  monthBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  monthBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  monthDelta: {
    fontFamily: "SpaceMono",
    fontSize: 9.5,
    letterSpacing: 1,
    color: colors.paperFaint,
    textTransform: "uppercase",
  },
  // Stat row (goal mode)
  statRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  // Breakdown
  breakdownCard: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: spacing.cardRadius,
    overflow: "hidden",
  },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
  },
  breakdownTitle: {
    fontSize: 22,
    color: colors.paper,
  },
  breakdownCount: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.paperDim,
    textTransform: "uppercase",
  },
  breakdownEmpty: {
    fontSize: 15,
    fontStyle: "italic",
    color: colors.paperFaint,
    textAlign: "center",
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
  breakdownRowBody: {
    flex: 1,
    marginRight: 12,
  },
  breakdownProject: {
    fontSize: 16,
    color: colors.paper,
    lineHeight: 18,
  },
  breakdownRole: {
    fontFamily: "SpaceMono",
    fontSize: 9.5,
    letterSpacing: 1,
    color: colors.paperFaint,
    marginTop: 3,
    textTransform: "uppercase",
  },
  breakdownRowRight: {
    alignItems: "flex-end",
    gap: 3,
  },
  breakdownPay: {
    fontFamily: "SpaceMono",
    fontSize: 13,
    color: colors.paper,
  },
  breakdownStatus: {
    fontFamily: "SpaceMono",
    fontSize: 9,
    letterSpacing: 1,
    color: colors.paperFaint,
  },
  // Goal
  goalHeadline: {
    fontSize: 34,
    color: colors.paper,
    textAlign: "center",
    lineHeight: 37,
  },
  goalRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 10,
    borderColor: colors.green,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 16,
  },
  goalRingPct: {
    fontSize: 40,
    color: colors.paper,
  },
  goalRingLabel: {
    fontFamily: "SpaceMono",
    fontSize: 9,
    letterSpacing: 2,
    color: colors.paperFaint,
    marginTop: 4,
  },
  goalSubtext: {
    fontFamily: "SpaceMono",
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.green,
    textAlign: "center",
    marginTop: 8,
    textTransform: "uppercase",
  },
  goalHint: {
    fontSize: 15,
    fontStyle: "italic",
    color: colors.paperFaint,
    textAlign: "center",
    marginTop: 24,
  },
  // Placeholder
  placeholderContainer: {
    marginTop: 60,
    paddingHorizontal: spacing.screenPadding,
    alignItems: "center",
  },
  placeholderTitle: {
    fontSize: 24,
    color: colors.paper,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.paperDim,
    textAlign: "center",
  },
});
