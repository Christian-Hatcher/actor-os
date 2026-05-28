import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing } from "@/lib/theme";
import { composeBriefing, timeOfDayGreeting } from "@/lib/briefing";
import {
  formatPayCompact,
  initials,
  isActiveAudition,
  rollupEarnings,
  parsePay,
} from "@/lib/format";
import {
  useAuditions,
  useReminders,
  useSelfTapes,
  useContacts,
  useContracts,
  usePendingApprovals,
} from "@/hooks/use-data";
import type { Audition } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function metaDate(city: string): string {
  const now = new Date();
  const wd = now.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const day = now.getDate();
  const mon = now.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  return `${wd} \u00B7 ${day} ${mon} \u00B7 ${city.toUpperCase()}`;
}

function thisWeek(auditions: Audition[]): Audition[] {
  const now = new Date();
  const weekAhead = new Date(now);
  weekAhead.setDate(now.getDate() + 7);
  return auditions
    .filter((a) => {
      const d = a.callback_date || a.shoot_date || a.submitted_date;
      if (!d) return false;
      const date = new Date(d);
      return date >= new Date(now.toDateString()) && date <= weekAhead;
    })
    .slice(0, 5);
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  callback: { label: "CB", color: colors.amber },
  submitted: { label: "SUB", color: colors.blue },
  pinned: { label: "PIN", color: colors.blue },
  booked: { label: "BK", color: colors.green },
  passed: { label: "PASS", color: colors.paperFaint },
  archived: { label: "ARCH", color: colors.paperFaint },
};

// ---------------------------------------------------------------------------
// Week Strip
// ---------------------------------------------------------------------------

function WeekStrip({ auditions }: { auditions: Audition[] }) {
  const days = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const dayAuditions = auditions.filter((a) => {
        const ad = a.callback_date || a.shoot_date || a.submitted_date;
        return ad && ad.slice(0, 10) === key;
      });
      result.push({
        key,
        date: d,
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
        dayNum: d.getDate(),
        isToday: i === 0,
        count: dayAuditions.length,
        hasCallback: dayAuditions.some((a) => a.status === "callback"),
        hasBooked: dayAuditions.some((a) => a.status === "booked"),
      });
    }
    return result;
  }, [auditions]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={s.weekStrip}
      contentContainerStyle={s.weekStripContent}
    >
      {days.map((d) => (
        <View
          key={d.key}
          style={[
            s.weekDay,
            d.isToday && s.weekDayToday,
            d.hasBooked && s.weekDayBooked,
            d.hasCallback && !d.hasBooked && s.weekDayCallback,
          ]}
        >
          <Text style={[s.weekDayName, d.isToday && s.weekDayNameToday]}>
            {d.dayName}
          </Text>
          <Text style={[s.weekDayNum, d.isToday && s.weekDayNumToday]}>
            {d.dayNum}
          </Text>
          {d.count > 0 && (
            <View
              style={[
                s.weekDot,
                { backgroundColor: d.hasBooked ? colors.green : d.hasCallback ? colors.amber : colors.blue },
              ]}
            />
          )}
        </View>
      ))}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Accordion Section
// ---------------------------------------------------------------------------

function AccordionSection({
  title,
  meta,
  tone,
  children,
  defaultOpen = false,
}: {
  title: string;
  meta: string;
  tone?: "good" | "urgent" | "default";
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const toneColor =
    tone === "good" ? colors.green : tone === "urgent" ? colors.red : colors.paperDim;

  return (
    <View style={s.accordion}>
      <TouchableOpacity
        style={s.accordionHeader}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <Text style={s.accordionTitle}>{title}</Text>
        <Text style={[s.accordionMeta, { color: toneColor }]}>{meta}</Text>
        <Text style={s.accordionChevron}>{open ? "\u25B2" : "\u25BC"}</Text>
      </TouchableOpacity>
      {open && <View style={s.accordionBody}>{children}</View>}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Mini Audition Row
// ---------------------------------------------------------------------------

function AuditionMiniRow({ a }: { a: Audition }) {
  const router = useRouter();
  const d = a.callback_date || a.shoot_date || a.submitted_date;
  const date = d ? new Date(d) : null;
  const statusInfo = STATUS_LABELS[a.status] || { label: a.status.toUpperCase(), color: colors.paperFaint };

  return (
    <TouchableOpacity
      style={s.miniRow}
      activeOpacity={0.7}
      onPress={() => {
        // Detail screen not yet built; just navigate to auditions tab
      }}
    >
      <View style={s.miniRowDate}>
        <Text style={s.miniRowDay}>{date ? date.getDate() : "--"}</Text>
        <Text style={s.miniRowWeekday}>
          {date ? date.toLocaleDateString("en-US", { weekday: "short" }) : "soon"}
        </Text>
      </View>
      <View style={s.miniRowBody}>
        <Text style={s.miniRowProject} numberOfLines={1}>
          {a.project_name}
        </Text>
        <Text style={s.miniRowSub} numberOfLines={1}>
          {[a.role_name, a.location, a.casting_director && `w/ ${a.casting_director}`]
            .filter(Boolean)
            .join(" \u00B7 ")}
        </Text>
      </View>
      <View style={s.miniRowRight}>
        <View style={[s.chip, { backgroundColor: statusInfo.color + "22", borderColor: statusInfo.color + "44" }]}>
          <Text style={[s.chipText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
        </View>
        {a.compensation && (
          <Text style={s.miniRowComp}>{a.compensation}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Briefing Card (renders plain text instead of HTML in RN)
// ---------------------------------------------------------------------------

function BriefingCard({
  briefing,
}: {
  briefing: { label: string; html: string };
}) {
  // Strip HTML tags for plain text rendering in React Native
  const plainText = briefing.html.replace(/<[^>]+>/g, "");

  return (
    <View style={s.briefingCard}>
      <Text style={s.briefingLabel}>{briefing.label.toUpperCase()}</Text>
      <Text style={s.briefingProse}>{plainText}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Today Screen
// ---------------------------------------------------------------------------

export default function TodayScreen() {
  const { auditions, loading: auditionsLoading } = useAuditions();
  const { reminders } = useReminders();
  const { selfTapes } = useSelfTapes();
  const { contacts } = useContacts();
  const { contracts } = useContracts();
  const { count: approvalsCount } = usePendingApprovals();
  const [refreshing, setRefreshing] = useState(false);

  // Placeholder profile data -- will be wired to auth context later
  const name = null as string | null;
  const city = "Tokyo";

  const briefing = useMemo(
    () => composeBriefing(auditions, reminders, name),
    [auditions, reminders, name]
  );

  const activeAuditions = auditions.filter(isActiveAudition);
  const week = useMemo(() => thisWeek(auditions), [auditions]);
  const { banked, potential } = useMemo(() => rollupEarnings(auditions), [auditions]);

  const now = new Date();
  const tapesDue = selfTapes.filter((t) => !t.submitted);
  const tapesDueToday = tapesDue.filter(
    (t) => t.deadline && new Date(t.deadline).toDateString() === now.toDateString()
  );
  const contractsToReview = contracts.filter((c) => c.status !== "signed");
  const flaggedContracts = contracts.filter((c) => (c.red_flags?.length ?? 0) > 0);
  const followUps = contacts.filter((c) => {
    if (!c.last_contact_date) return true;
    const days = (now.getTime() - new Date(c.last_contact_date).getTime()) / 86_400_000;
    return days >= 7;
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Re-mount triggers re-fetch; for now just toggle the indicator
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.screenContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.amber}
        />
      }
    >
      {/* Meta date line */}
      <View style={s.metaRow}>
        <View style={s.metaLeft}>
          <View style={s.pulseDot} />
          <Text style={s.metaText}>{metaDate(city)}</Text>
        </View>
        <View style={s.avatarCircle}>
          <Text style={s.avatarText}>{initials(name)}</Text>
        </View>
      </View>

      {/* Greeting */}
      <Text style={s.greeting}>
        {name !== null
          ? `${timeOfDayGreeting()},\n${name.split(" ")[0]}.`
          : "Welcome back."}
      </Text>

      {/* Briefing */}
      <BriefingCard briefing={briefing} />

      {/* Week strip */}
      <WeekStrip auditions={auditions} />

      {/* Accordion sections */}
      <Text style={s.sectionLabel}>YOUR WORK</Text>

      {auditionsLoading ? (
        <ActivityIndicator color={colors.amber} style={{ marginVertical: 40 }} />
      ) : (
        <>
          <AccordionSection
            title="Auditions"
            meta={`${activeAuditions.length} active`}
            defaultOpen
          >
            <Text style={s.bodyText}>
              <Text style={s.bodyBold}>{week.length} this week.</Text>
              {"  "}
              {activeAuditions.filter((a) => a.status === "callback").length} callback,{" "}
              {activeAuditions.filter((a) => a.status === "submitted").length} submitted.
            </Text>
            {week.length > 0 ? (
              week.map((a) => <AuditionMiniRow key={a.id} a={a} />)
            ) : (
              <Text style={s.emptyText}>Nothing on the books this week.</Text>
            )}
          </AccordionSection>

          <AccordionSection
            title="Earnings"
            meta={`${formatPayCompact(banked)} / ${formatPayCompact(banked + potential)}`}
            tone="good"
          >
            <Text style={s.bodyText}>
              <Text style={[s.bodyBold, { color: colors.green }]}>
                {formatPayCompact(banked)} banked.
              </Text>
              {potential > 0 && `  ${formatPayCompact(potential)} still in play.`}
            </Text>
          </AccordionSection>

          <AccordionSection
            title="Self-tapes"
            meta={`${tapesDue.length} due`}
            tone={tapesDueToday.length > 0 ? "urgent" : "default"}
          >
            {tapesDue.length > 0 ? (
              tapesDue.slice(0, 4).map((t) => {
                const dueToday =
                  t.deadline && new Date(t.deadline).toDateString() === now.toDateString();
                return (
                  <View
                    key={t.id}
                    style={[s.tapeCard, dueToday && s.tapeCardUrgent]}
                  >
                    <View style={s.tapeHeader}>
                      <Text style={s.tapeTitle}>{t.title}</Text>
                      {t.deadline && (
                        <Text style={[s.tapeDue, dueToday && { color: colors.red }]}>
                          {new Date(t.deadline).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </Text>
                      )}
                    </View>
                    <Text style={s.tapeSub}>
                      {t.scene_partner ? `Scene partner: ${t.scene_partner} \u00B7 ` : ""}
                      not recorded
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text style={s.emptyText}>No tapes due. Nice.</Text>
            )}
          </AccordionSection>

          <AccordionSection
            title="Contracts"
            meta={`${contractsToReview.length} to review`}
            tone={flaggedContracts.length > 0 ? "urgent" : "default"}
          >
            {contractsToReview.length > 0 ? (
              <Text style={s.bodyText}>
                <Text style={s.bodyBold}>{contractsToReview[0].title}</Text>
                {flaggedContracts.length > 0 &&
                  ` -- ${flaggedContracts[0].red_flags?.length} red flags flagged by AI.`}
              </Text>
            ) : (
              <Text style={s.emptyText}>No contracts waiting on you.</Text>
            )}
          </AccordionSection>

          <AccordionSection
            title="Outreach"
            meta={`${followUps.length} to follow up`}
          >
            {followUps.length > 0 ? (
              <Text style={s.bodyText}>
                <Text style={s.bodyBold}>{followUps[0].name}</Text>
                {followUps[0].last_contact_date
                  ? ` -- ${Math.round(
                      (now.getTime() - new Date(followUps[0].last_contact_date).getTime()) /
                        86_400_000
                    )} days since last contact.`
                  : " -- no contact logged yet."}
              </Text>
            ) : (
              <Text style={s.emptyText}>You're all caught up.</Text>
            )}
          </AccordionSection>

          <AccordionSection
            title="Needs approval"
            meta={`${approvalsCount} pending`}
            tone={approvalsCount > 0 ? "urgent" : "default"}
          >
            {approvalsCount > 0 ? (
              <Text style={s.bodyText}>
                {approvalsCount} parsed from email, ready to review and one-tap approve.
              </Text>
            ) : (
              <Text style={s.emptyText}>Nothing pending approval.</Text>
            )}
          </AccordionSection>
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
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  pulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.green,
    marginRight: 6,
  },
  metaText: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    letterSpacing: 2,
    color: colors.paperFaint,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.ruleStrong,
    backgroundColor: colors.bg3,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    color: colors.paper,
  },
  greeting: {
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -0.6,
    color: colors.paper,
    marginBottom: 22,
  },
  // Briefing card
  briefingCard: {
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: spacing.cardRadius,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 16,
  },
  briefingLabel: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    letterSpacing: 2,
    color: colors.amber,
    marginBottom: 10,
  },
  briefingProse: {
    fontSize: 18,
    lineHeight: 27,
    color: colors.paper,
    fontStyle: "italic",
  },
  // Week strip
  weekStrip: {
    marginBottom: 20,
    marginHorizontal: -spacing.screenPadding,
  },
  weekStripContent: {
    paddingHorizontal: spacing.screenPadding,
    gap: 8,
  },
  weekDay: {
    width: 52,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.rule,
    backgroundColor: "rgba(255,255,255,0.01)",
    alignItems: "center",
  },
  weekDayToday: {
    backgroundColor: colors.paper,
    borderColor: colors.paper,
  },
  weekDayBooked: {
    borderColor: colors.green + "55",
    backgroundColor: colors.green + "15",
  },
  weekDayCallback: {
    borderColor: colors.amber + "55",
    backgroundColor: colors.amber + "15",
  },
  weekDayName: {
    fontFamily: "SpaceMono",
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.paperFaint,
    marginBottom: 4,
  },
  weekDayNameToday: {
    color: colors.bg,
  },
  weekDayNum: {
    fontSize: 20,
    color: colors.paper,
  },
  weekDayNumToday: {
    color: colors.bg,
    fontWeight: "600",
  },
  weekDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 5,
  },
  // Accordion
  accordion: {
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    marginBottom: 2,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  accordionTitle: {
    flex: 1,
    fontSize: 18,
    color: colors.paper,
  },
  accordionMeta: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    letterSpacing: 1,
    color: colors.paperDim,
    marginRight: 10,
  },
  accordionChevron: {
    fontSize: 10,
    color: colors.paperFaint,
  },
  accordionBody: {
    paddingBottom: 16,
  },
  // Section label
  sectionLabel: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    letterSpacing: 2,
    color: colors.paperFaint,
    marginBottom: 10,
    marginTop: 10,
  },
  // Mini rows
  miniRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    gap: 12,
  },
  miniRowDate: {
    width: 44,
    alignItems: "center",
  },
  miniRowDay: {
    fontSize: 22,
    color: colors.paper,
  },
  miniRowWeekday: {
    fontFamily: "SpaceMono",
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.paperFaint,
    marginTop: 2,
  },
  miniRowBody: {
    flex: 1,
  },
  miniRowProject: {
    fontSize: 17,
    color: colors.paper,
    lineHeight: 20,
  },
  miniRowSub: {
    fontSize: 11.5,
    color: colors.paperDim,
    marginTop: 2,
  },
  miniRowRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  miniRowComp: {
    fontFamily: "SpaceMono",
    fontSize: 10.5,
    letterSpacing: 0.4,
    color: colors.paperDim,
  },
  // Chips
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: "SpaceMono",
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  // Body text
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.paperDim,
  },
  bodyBold: {
    fontWeight: "500",
    color: colors.paper,
  },
  emptyText: {
    fontSize: 15,
    fontStyle: "italic",
    color: colors.paperFaint,
    marginTop: 4,
  },
  // Tape cards (in accordion)
  tapeCard: {
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
  },
  tapeCardUrgent: {
    borderColor: colors.red + "44",
    backgroundColor: colors.red + "08",
  },
  tapeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  tapeTitle: {
    fontSize: 18,
    color: colors.paper,
    flex: 1,
  },
  tapeDue: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    letterSpacing: 1,
    color: colors.paperDim,
  },
  tapeSub: {
    fontSize: 12,
    color: colors.paperDim,
  },
});
