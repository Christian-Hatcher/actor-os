import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { colors, spacing } from "@/lib/theme";
import { useSelfTapes } from "@/hooks/use-data";
import { supabase } from "@/lib/supabase";
import type { SelfTape } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TapeState = "empty" | "draft" | "submitted";

function tapeState(t: SelfTape): TapeState {
  if (t.submitted) return "submitted";
  if (t.video_url) return "draft";
  return "empty";
}

function isDueToday(t: SelfTape): boolean {
  return !!t.deadline && new Date(t.deadline).toDateString() === new Date().toDateString();
}

function stateChipInfo(t: SelfTape): { label: string; color: string } {
  const state = tapeState(t);
  if (state === "submitted") {
    return { label: t.feedback ? "CALLBACK" : "SUBMITTED", color: colors.green };
  }
  if (state === "draft") {
    return { label: "DRAFT", color: colors.amber };
  }
  if (isDueToday(t)) {
    return {
      label: t.deadline
        ? new Date(t.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "DUE TODAY",
      color: colors.red,
    };
  }
  return {
    label: t.deadline
      ? new Date(t.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "NOT RECORDED",
    color: colors.paperFaint,
  };
}

// ---------------------------------------------------------------------------
// Tape Card
// ---------------------------------------------------------------------------

function TapeCard({
  t,
  onUpload,
  onSubmit,
}: {
  t: SelfTape;
  onUpload: (tape: SelfTape) => void;
  onSubmit: (tape: SelfTape) => void;
}) {
  const state = tapeState(t);
  const urgent = state === "empty" && isDueToday(t);
  const chipInfo = stateChipInfo(t);

  async function pickVideo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your media library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      onUpload({ ...t, video_url: result.assets[0].uri });
    }
  }

  return (
    <View
      style={[
        s.tapeCard,
        urgent && s.tapeCardUrgent,
        state === "submitted" && s.tapeCardSubmitted,
      ]}
    >
      {/* Preview area */}
      <View
        style={[
          s.tapePreview,
          urgent && { borderBottomColor: colors.red + "33" },
        ]}
      >
        {state === "empty" ? (
          <View style={s.previewEmpty}>
            <Text style={s.previewIcon}>{"\uD83C\uDFA5"}</Text>
            <Text style={s.previewLabel}>NOT RECORDED</Text>
          </View>
        ) : (
          <View style={s.previewHasVideo}>
            <Text style={s.previewPlayIcon}>{"\u25B6"}</Text>
            <View style={s.previewBadge}>
              <Text style={s.previewBadgeText}>
                {state === "submitted" ? "submitted" : "draft"}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={s.tapeBody}>
        <View style={s.tapeTopRow}>
          <Text style={s.tapeType}>
            {t.audition_id ? "SELF-TAPE" : "OPEN SUBMISSION"}
          </Text>
          <View style={[s.chip, { backgroundColor: chipInfo.color + "22", borderColor: chipInfo.color + "44" }]}>
            <Text style={[s.chipText, { color: chipInfo.color }]}>{chipInfo.label}</Text>
          </View>
        </View>

        <Text style={s.tapeTitle}>{t.title}</Text>

        <View style={s.tapeMeta}>
          {t.scene_partner && (
            <Text style={s.tapeMetaText}>partner: {t.scene_partner}</Text>
          )}
          {t.deadline && (
            <Text style={[s.tapeMetaText, isDueToday(t) && { color: colors.red }]}>
              due{" "}
              {new Date(t.deadline).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </Text>
          )}
        </View>

        {/* Feedback */}
        {state === "submitted" && t.feedback && (
          <View style={s.feedbackBox}>
            <Text style={s.feedbackLabel}>CD FEEDBACK</Text>
            <Text style={s.feedbackText}>{t.feedback}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={s.tapeActions}>
          {state === "empty" && (
            <>
              <TouchableOpacity style={s.actionPrimary} onPress={pickVideo} activeOpacity={0.7}>
                <Text style={s.actionPrimaryText}>Upload video</Text>
              </TouchableOpacity>
            </>
          )}
          {state === "draft" && (
            <>
              <TouchableOpacity
                style={s.actionPrimary}
                onPress={() => onSubmit(t)}
                activeOpacity={0.7}
              >
                <Text style={s.actionPrimaryText}>Review and submit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionSecondary} onPress={pickVideo} activeOpacity={0.7}>
                <Text style={s.actionSecondaryText}>Reshoot</Text>
              </TouchableOpacity>
            </>
          )}
          {state === "submitted" && (
            <TouchableOpacity style={s.actionSecondary} activeOpacity={0.7}>
              <Text style={s.actionSecondaryText}>Re-watch</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Self-tapes Screen
// ---------------------------------------------------------------------------

export default function TapesScreen() {
  const { selfTapes, loading, addSelfTape, updateSelfTape } = useSelfTapes();

  const due = selfTapes.filter((t) => !t.submitted);

  async function handleUpload(updated: SelfTape) {
    try {
      await updateSelfTape(updated.id, { video_url: updated.video_url });
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to save video URL");
    }
  }

  async function handleSubmit(tape: SelfTape) {
    try {
      await updateSelfTape(tape.id, { submitted: true });
      Alert.alert("Done", "Self-tape submitted!");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to submit");
    }
  }

  const handleCreate = useCallback(() => {
    Alert.prompt(
      "New Self-Tape",
      "Title:",
      async (title) => {
        if (!title?.trim()) return;
        try {
          await addSelfTape({
            title: title.trim(),
            video_url: null,
            thumbnail_url: null,
            audition_id: null,
            scene_partner: null,
            deadline: null,
            submitted: false,
            feedback: null,
          });
        } catch (err) {
          Alert.alert("Error", err instanceof Error ? err.message : "Failed to create");
        }
      },
      "plain-text"
    );
  }, [addSelfTape]);

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <View style={s.headerMetaRow}>
            <View style={s.pulseDot} />
            <Text style={s.headerMeta}>
              {due.length} DUE \u00B7 {selfTapes.length} TOTAL
            </Text>
          </View>
          <Text style={s.headerTitle}>Self-tapes</Text>
        </View>
        <TouchableOpacity style={s.newButton} onPress={handleCreate} activeOpacity={0.7}>
          <Text style={s.newButtonText}>+ NEW</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator color={colors.amber} style={{ marginTop: 60 }} />
      ) : selfTapes.length === 0 ? (
        <View style={s.emptyContainer}>
          <Text style={s.emptyText}>No self-tapes yet.</Text>
          <TouchableOpacity style={s.actionPrimary} onPress={handleCreate} activeOpacity={0.7}>
            <Text style={s.actionPrimaryText}>Create your first self-tape</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={selfTapes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TapeCard t={item} onUpload={handleUpload} onSubmit={handleSubmit} />
          )}
          contentContainerStyle={{ paddingHorizontal: spacing.screenPadding, paddingBottom: 40 }}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: spacing.screenPadding,
    marginBottom: 16,
  },
  headerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  pulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.green,
    marginRight: 6,
  },
  headerMeta: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    letterSpacing: 2,
    color: colors.paperFaint,
  },
  headerTitle: {
    fontSize: 40,
    color: colors.paper,
    letterSpacing: -0.6,
  },
  newButton: {
    backgroundColor: colors.paper,
    borderRadius: spacing.pillRadius,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  newButtonText: {
    fontFamily: "SpaceMono",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    color: colors.bg,
  },
  // Tape card
  tapeCard: {
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: spacing.cardRadius,
    overflow: "hidden",
    marginTop: 14,
  },
  tapeCardUrgent: {
    borderColor: colors.red + "44",
  },
  tapeCardSubmitted: {
    borderColor: colors.green + "33",
  },
  // Preview
  tapePreview: {
    height: 170,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    backgroundColor: colors.bg3,
    justifyContent: "center",
    alignItems: "center",
  },
  previewEmpty: {
    alignItems: "center",
    gap: 8,
  },
  previewIcon: {
    fontSize: 28,
    opacity: 0.6,
  },
  previewLabel: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.paperFaint,
  },
  previewHasVideo: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
  previewPlayIcon: {
    fontSize: 32,
    color: colors.paper,
    opacity: 0.8,
  },
  previewBadge: {
    position: "absolute",
    right: 12,
    top: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: spacing.pillRadius,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  previewBadgeText: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    color: "#ffffff",
  },
  // Body
  tapeBody: {
    padding: 14,
  },
  tapeTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  tapeType: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.paperFaint,
  },
  tapeTitle: {
    fontSize: 22,
    color: colors.paper,
    lineHeight: 24,
    marginBottom: 8,
  },
  tapeMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4,
  },
  tapeMetaText: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.paperDim,
  },
  // Feedback
  feedbackBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.green + "33",
    backgroundColor: colors.green + "0A",
    borderRadius: 10,
    padding: 12,
  },
  feedbackLabel: {
    fontFamily: "SpaceMono",
    fontSize: 9,
    letterSpacing: 2,
    color: colors.green,
    marginBottom: 6,
  },
  feedbackText: {
    fontSize: 15,
    fontStyle: "italic",
    lineHeight: 22,
    color: colors.paper,
  },
  // Actions
  tapeActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  actionPrimary: {
    flex: 1,
    backgroundColor: colors.paper,
    borderRadius: spacing.buttonRadius,
    paddingVertical: 10,
    alignItems: "center",
  },
  actionPrimaryText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.bg,
  },
  actionSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.ruleStrong,
    borderRadius: spacing.buttonRadius,
    paddingVertical: 10,
    alignItems: "center",
  },
  actionSecondaryText: {
    fontSize: 13,
    fontWeight: "500",
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
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: spacing.screenPadding,
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    fontStyle: "italic",
    color: colors.paperFaint,
  },
});
