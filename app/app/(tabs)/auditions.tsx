import { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { colors, spacing } from "@/lib/theme";
import {
  useAuditions,
  useAuditionGroups,
  auditionAnchorDate,
} from "@/hooks/use-data";
import type { Audition } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Filter = "all" | "callback" | "submitted" | "booked" | "past";

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function statusClass(a: Audition): "cb" | "sub" | "bk" | "passed" | "" {
  if (a.status === "callback") return "cb";
  if (a.status === "submitted" || a.status === "pinned") return "sub";
  if (a.status === "booked") return "bk";
  if (a.status === "passed" || a.status === "archived") return "passed";
  return "";
}

function ribbonColor(sc: string): string {
  if (sc === "cb") return colors.amber;
  if (sc === "sub") return colors.blue;
  if (sc === "bk") return colors.green;
  return "transparent";
}

function chipBg(sc: string): string {
  if (sc === "cb") return colors.amber + "22";
  if (sc === "sub") return colors.blue + "22";
  if (sc === "bk") return colors.green + "22";
  if (sc === "passed") return colors.paperFaint + "22";
  return colors.rule;
}

function chipColor(sc: string): string {
  if (sc === "cb") return colors.amber;
  if (sc === "sub") return colors.blue;
  if (sc === "bk") return colors.green;
  if (sc === "passed") return colors.paperFaint;
  return colors.paperDim;
}

function timeLabel(a: Audition): string {
  const iso = auditionAnchorDate(a);
  if (!iso) return "--";
  const d = new Date(iso);
  const hasTime = iso.length > 10 && (d.getHours() !== 0 || d.getMinutes() !== 0);
  return hasTime
    ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-US", { weekday: "short" });
}

function matchesFilter(a: Audition, f: Filter): boolean {
  switch (f) {
    case "all":
      return a.status !== "passed" && a.status !== "archived";
    case "callback":
      return a.status === "callback";
    case "submitted":
      return a.status === "submitted" || a.status === "pinned";
    case "booked":
      return a.status === "booked";
    case "past":
      return a.status === "passed" || a.status === "archived";
  }
}

// ---------------------------------------------------------------------------
// Agenda Row
// ---------------------------------------------------------------------------

function AgendaRow({ a }: { a: Audition }) {
  const sc = statusClass(a);
  return (
    <TouchableOpacity style={s.agendaRow} activeOpacity={0.7}>
      <View style={[s.ribbon, { backgroundColor: ribbonColor(sc) }]} />
      <Text style={s.timeLabel}>{timeLabel(a)}</Text>
      <View style={s.agendaBody}>
        <Text style={s.agendaProject} numberOfLines={1}>
          {a.project_name}
        </Text>
        <Text style={s.agendaMeta} numberOfLines={1}>
          {[a.role_name, a.location, a.agency].filter(Boolean).join(" \u00B7 ") || "--"}
        </Text>
      </View>
      <View style={s.agendaRight}>
        <View style={[s.chip, { backgroundColor: chipBg(sc), borderColor: chipColor(sc) + "44" }]}>
          <Text style={[s.chipText, { color: chipColor(sc) }]}>{a.status.toUpperCase()}</Text>
        </View>
        {a.compensation && (
          <Text style={[s.compText, sc === "bk" && { color: colors.green }]}>
            {a.compensation}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// New Audition (simple Alert prompt -- full modal later)
// ---------------------------------------------------------------------------

function useCreateAudition() {
  const { addAudition } = useAuditions();

  return useCallback(() => {
    Alert.prompt(
      "New Audition",
      "Project name:",
      async (projectName) => {
        if (!projectName?.trim()) return;
        try {
          await addAudition({
            project_name: projectName.trim(),
            role_name: null,
            casting_director: null,
            agency: null,
            status: "submitted",
            submitted_date: new Date().toISOString().slice(0, 10),
            callback_date: null,
            shoot_date: null,
            location: null,
            compensation: null,
            notes: null,
            self_tape_url: null,
            headshot_url: null,
            resume_url: null,
            contract_url: null,
          });
        } catch (err) {
          Alert.alert("Error", err instanceof Error ? err.message : "Failed to create");
        }
      },
      "plain-text"
    );
  }, [addAudition]);
}

// ---------------------------------------------------------------------------
// Auditions Screen
// ---------------------------------------------------------------------------

export default function AuditionsScreen() {
  const { auditions, loading } = useAuditions();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const createAudition = useCreateAudition();

  const filtered = useMemo(
    () =>
      auditions.filter((a) => {
        const q = search.toLowerCase();
        const matchesSearch =
          !q ||
          a.project_name.toLowerCase().includes(q) ||
          a.role_name?.toLowerCase().includes(q) ||
          a.agency?.toLowerCase().includes(q);
        return matchesSearch && matchesFilter(a, filter);
      }),
    [auditions, search, filter]
  );

  const groups = useAuditionGroups(filtered);

  const counts = useMemo(() => {
    const active = auditions.filter((a) => a.status !== "passed" && a.status !== "archived");
    return {
      all: active.length,
      callback: auditions.filter((a) => a.status === "callback").length,
      submitted: auditions.filter((a) => a.status === "submitted" || a.status === "pinned").length,
      booked: auditions.filter((a) => a.status === "booked").length,
      past: auditions.filter((a) => a.status === "passed" || a.status === "archived").length,
    };
  }, [auditions]);

  const filterDefs: Array<{ key: Filter; label: string; n: number }> = [
    { key: "all", label: "All", n: counts.all },
    { key: "callback", label: "Callback", n: counts.callback },
    { key: "submitted", label: "Submitted", n: counts.submitted },
    { key: "booked", label: "Booked", n: counts.booked },
    { key: "past", label: "Past", n: counts.past },
  ];

  // Build flat list data: section headers + rows
  const listData = useMemo(() => {
    const items: Array<
      | { type: "header"; key: string; label: string; count: number }
      | { type: "row"; key: string; audition: Audition }
    > = [];
    for (const g of groups) {
      items.push({ type: "header", key: `h-${g.key}`, label: g.label, count: g.auditions.length });
      for (const a of g.auditions) {
        items.push({ type: "row", key: a.id, audition: a });
      }
    }
    return items;
  }, [groups]);

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerMeta}>
            {new Date()
              .toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })
              .toUpperCase()}{" "}
            \u00B7 {counts.all} ACTIVE
          </Text>
          <Text style={s.headerTitle}>Auditions</Text>
        </View>
        <TouchableOpacity style={s.addButton} onPress={createAudition} activeOpacity={0.7}>
          <Text style={s.addButtonText}>+ ADD</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search projects, roles, agencies"
          placeholderTextColor={colors.paperFaint}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterStrip}
        contentContainerStyle={s.filterStripContent}
      >
        {filterDefs.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              s.filterChip,
              filter === f.key && s.filterChipActive,
            ]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                s.filterChipText,
                filter === f.key && s.filterChipTextActive,
              ]}
            >
              {f.label}{" "}
              <Text style={{ opacity: 0.6 }}>{f.n}</Text>
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <ActivityIndicator
          color={colors.amber}
          style={{ marginTop: 60 }}
        />
      ) : listData.length === 0 ? (
        <Text style={s.emptyText}>
          {search || filter !== "all" ? "Nothing matches." : "No auditions yet. Add your first."}
        </Text>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            if (item.type === "header") {
              return (
                <View style={s.groupHeader}>
                  <View style={s.groupHeaderLine} />
                  <Text
                    style={[
                      s.groupHeaderLabel,
                      item.label.startsWith("Today") && { color: colors.amber },
                    ]}
                  >
                    {item.label.startsWith("Today") && "\u25CF  "}
                    {item.label}
                  </Text>
                  <Text style={s.groupHeaderCount}>
                    {item.count} {item.count === 1 ? "item" : "items"}
                  </Text>
                </View>
              );
            }
            return <AgendaRow a={item.audition} />;
          }}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 60,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: spacing.screenPadding,
    marginBottom: 12,
  },
  headerMeta: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    letterSpacing: 2,
    color: colors.paperFaint,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 40,
    color: colors.paper,
    letterSpacing: -0.6,
  },
  addButton: {
    backgroundColor: colors.paper,
    borderRadius: spacing.pillRadius,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addButtonText: {
    fontFamily: "SpaceMono",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    color: colors.bg,
  },
  // Search
  searchRow: {
    paddingHorizontal: spacing.screenPadding,
    marginBottom: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: spacing.pillRadius,
    backgroundColor: "rgba(255,255,255,0.025)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.paper,
  },
  // Filters
  filterStrip: {
    marginBottom: 8,
  },
  filterStripContent: {
    paddingHorizontal: spacing.screenPadding,
    gap: 6,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: spacing.pillRadius,
    backgroundColor: "rgba(255,255,255,0.025)",
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  filterChipActive: {
    backgroundColor: colors.paper,
    borderColor: colors.paper,
  },
  filterChipText: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    letterSpacing: 1,
    color: colors.paperDim,
    textTransform: "uppercase",
  },
  filterChipTextActive: {
    color: colors.bg,
  },
  // Group headers
  groupHeader: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 24,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  groupHeaderLine: {
    position: "absolute",
    top: 0,
    left: spacing.screenPadding,
    right: spacing.screenPadding,
    height: 1,
    backgroundColor: colors.ruleStrong,
  },
  groupHeaderLabel: {
    fontSize: 24,
    fontStyle: "italic",
    color: colors.paper,
    letterSpacing: -0.1,
    flex: 1,
  },
  groupHeaderCount: {
    fontFamily: "SpaceMono",
    fontSize: 9.5,
    letterSpacing: 1.6,
    color: colors.paperFaint,
    textTransform: "uppercase",
  },
  // Agenda row
  agendaRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingLeft: spacing.screenPadding + 4,
    paddingRight: spacing.screenPadding,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
  ribbon: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
  },
  timeLabel: {
    fontFamily: "SpaceMono",
    fontSize: 11,
    letterSpacing: 0.4,
    color: colors.paperDim,
    width: 56,
  },
  agendaBody: {
    flex: 1,
    marginRight: 12,
  },
  agendaProject: {
    fontSize: 22,
    color: colors.paper,
    lineHeight: 25,
    letterSpacing: -0.05,
  },
  agendaMeta: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.paperFaint,
    marginTop: 6,
    textTransform: "uppercase",
  },
  agendaRight: {
    alignItems: "flex-end",
    gap: 7,
  },
  compText: {
    fontFamily: "SpaceMono",
    fontSize: 11.5,
    color: colors.paper,
  },
  // Chip
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
  // Empty
  emptyText: {
    fontSize: 18,
    fontStyle: "italic",
    color: colors.paperFaint,
    textAlign: "center",
    marginTop: 60,
    paddingHorizontal: spacing.screenPadding,
  },
});
