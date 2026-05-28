import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { colors, spacing } from "@/lib/theme";
import { useAuth } from "@/hooks/use-auth";
import { initials } from "@/lib/format";

// ---------------------------------------------------------------------------
// Theme IDs (from src/lib/themes.ts)
// ---------------------------------------------------------------------------

const THEME_IDS = [
  { id: "cinematic", name: "Cinematic Dark" },
  { id: "ivory", name: "Light Ivory" },
];

// ---------------------------------------------------------------------------
// Currency options
// ---------------------------------------------------------------------------

const CURRENCIES = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "JPY", label: "Japanese Yen", symbol: "\u00A5" },
  { code: "GBP", label: "British Pound", symbol: "\u00A3" },
  { code: "EUR", label: "Euro", symbol: "\u20AC" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "CAD", label: "Canadian Dollar", symbol: "C$" },
];

// ---------------------------------------------------------------------------
// Section component
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Me/Settings Screen
// ---------------------------------------------------------------------------

export default function MeScreen() {
  const { profile: authProfile, user, signOut } = useAuth();
  const profile = {
    full_name: authProfile?.full_name ?? null,
    email: user?.email ?? "actor@example.com",
    avatar_url: authProfile?.avatar_url ?? null,
    subscription_tier: (authProfile?.subscription_tier ?? "free") as "free" | "monthly" | "yearly",
    subscription_status: authProfile?.subscription_status ?? "inactive",
    currency: authProfile?.currency ?? "USD",
    theme_id: authProfile?.theme_id ?? "cinematic",
  };

  const [selectedTheme, setSelectedTheme] = useState(profile.theme_id);
  const [selectedCurrency, setSelectedCurrency] = useState(profile.currency);

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  }

  const subscriptionLabel =
    profile.subscription_tier === "yearly"
      ? "$45/year"
      : profile.subscription_tier === "monthly"
        ? "$5/month"
        : "Free";

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.screenContent}>
      {/* Profile header */}
      <View style={s.profileHeader}>
        <View style={s.avatarLarge}>
          <Text style={s.avatarLargeText}>{initials(profile.full_name)}</Text>
        </View>
        <Text style={s.profileName}>
          {profile.full_name || "Actor"}
        </Text>
        <Text style={s.profileEmail}>{profile.email}</Text>
      </View>

      {/* Theme picker */}
      <Section title="Appearance">
        <View style={s.optionGrid}>
          {THEME_IDS.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[
                s.optionCard,
                selectedTheme === t.id && s.optionCardActive,
              ]}
              onPress={() => setSelectedTheme(t.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  s.themePreview,
                  {
                    backgroundColor:
                      t.id === "cinematic" ? "#0a0908" : "#eaeef2",
                  },
                ]}
              >
                <View
                  style={[
                    s.themePreviewAccent,
                    {
                      backgroundColor:
                        t.id === "cinematic" ? colors.amber : "#a37314",
                    },
                  ]}
                />
              </View>
              <Text style={s.optionLabel}>{t.name}</Text>
              <Text style={s.optionMeta}>
                {selectedTheme === t.id ? "Active" : "Tap to use"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      {/* Currency */}
      <Section title="Currency">
        <View style={s.currencyGrid}>
          {CURRENCIES.map((c) => (
            <TouchableOpacity
              key={c.code}
              style={[
                s.currencyCard,
                selectedCurrency === c.code && s.currencyCardActive,
              ]}
              onPress={() => setSelectedCurrency(c.code)}
              activeOpacity={0.7}
            >
              <Text style={s.currencySymbol}>{c.symbol}</Text>
              <Text style={s.currencyLabel}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      {/* Subscription */}
      <Section title="Subscription">
        <View style={s.subscriptionCard}>
          <View style={s.subscriptionRow}>
            <View>
              <Text style={s.subscriptionPlan}>
                Actor OS{" "}
                {profile.subscription_tier === "free"
                  ? "Free"
                  : profile.subscription_tier}
              </Text>
              <Text style={s.subscriptionStatus}>
                {profile.subscription_status}
              </Text>
            </View>
            <Text style={s.subscriptionPrice}>{subscriptionLabel}</Text>
          </View>
          {profile.subscription_tier === "free" && (
            <TouchableOpacity style={s.upgradeButton} activeOpacity={0.7}>
              <Text style={s.upgradeButtonText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          )}
        </View>
      </Section>

      {/* AI Connection placeholder */}
      <Section title="AI Connection">
        <View style={s.aiCard}>
          <View style={s.aiRow}>
            <Text style={s.aiLabel}>Provider</Text>
            <Text style={s.aiValue}>Not configured</Text>
          </View>
          <View style={s.aiDivider} />
          <View style={s.aiRow}>
            <Text style={s.aiLabel}>API Key</Text>
            <Text style={s.aiValue}>-- -- -- --</Text>
          </View>
          <View style={s.aiDivider} />
          <View style={s.aiRow}>
            <Text style={s.aiLabel}>Model</Text>
            <Text style={s.aiValue}>Default</Text>
          </View>
        </View>
      </Section>

      {/* Sign out */}
      <TouchableOpacity style={s.signOutButton} onPress={handleSignOut} activeOpacity={0.7}>
        <Text style={s.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 60 }} />
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
  // Profile
  profileHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.ruleStrong,
    backgroundColor: colors.bg3,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarLargeText: {
    fontSize: 28,
    color: colors.paper,
  },
  profileName: {
    fontSize: 28,
    color: colors.paper,
    marginBottom: 4,
  },
  profileEmail: {
    fontFamily: "SpaceMono",
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.paperDim,
  },
  // Section
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    letterSpacing: 2,
    color: colors.paperFaint,
    marginBottom: 12,
  },
  // Theme picker
  optionGrid: {
    flexDirection: "row",
    gap: 12,
  },
  optionCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 12,
    padding: 12,
  },
  optionCardActive: {
    borderColor: colors.amber,
  },
  themePreview: {
    width: "100%",
    height: 32,
    borderRadius: 8,
    marginBottom: 8,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  themePreviewAccent: {
    height: 4,
    width: "50%",
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.paper,
    marginBottom: 2,
  },
  optionMeta: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.paperFaint,
    textTransform: "uppercase",
  },
  // Currency
  currencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  currencyCard: {
    width: "31%",
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 10,
    padding: 10,
  },
  currencyCardActive: {
    borderColor: colors.amber,
    backgroundColor: colors.amber + "0A",
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.paper,
    marginBottom: 2,
  },
  currencyLabel: {
    fontSize: 11,
    color: colors.paperDim,
  },
  // Subscription
  subscriptionCard: {
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 12,
    padding: 16,
  },
  subscriptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subscriptionPlan: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.paper,
  },
  subscriptionStatus: {
    fontSize: 12,
    color: colors.paperDim,
    marginTop: 2,
  },
  subscriptionPrice: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.paper,
  },
  upgradeButton: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.ruleStrong,
    borderRadius: spacing.buttonRadius,
    paddingVertical: 10,
    alignItems: "center",
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.paper,
  },
  // AI
  aiCard: {
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 12,
    overflow: "hidden",
  },
  aiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  aiDivider: {
    height: 1,
    backgroundColor: colors.rule,
  },
  aiLabel: {
    fontSize: 14,
    color: colors.paper,
  },
  aiValue: {
    fontFamily: "SpaceMono",
    fontSize: 12,
    color: colors.paperFaint,
  },
  // Sign out
  signOutButton: {
    borderWidth: 1,
    borderColor: colors.ruleStrong,
    borderRadius: spacing.buttonRadius,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.red,
  },
});
