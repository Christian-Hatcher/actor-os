import { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native"
import { useRouter } from "expo-router"
import { useAuth } from "@/hooks/use-auth"
import { colors, spacing } from "@/lib/theme"

export default function LoginScreen() {
  const { signIn } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSignIn() {
    if (!email || !password) {
      setError("Email and password are required.")
      return
    }
    setError(null)
    setLoading(true)
    const { error: authError } = await signIn(email.trim(), password)
    setLoading(false)
    if (authError) {
      setError(authError.message ?? "Sign in failed.")
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={s.inner}>
        <Text style={s.brand}>Actor OS</Text>
        <Text style={s.tagline}>Your career, one screen.</Text>

        <View style={s.form}>
          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor={colors.paperFaint}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
          />
          <TextInput
            style={s.input}
            placeholder="Password"
            placeholderTextColor={colors.paperFaint}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={handleSignIn}
          />

          {error && <Text style={s.error}>{error}</Text>}

          <TouchableOpacity
            style={[s.button, loading && s.buttonDisabled]}
            onPress={handleSignIn}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <Text style={s.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.replace("/signup")}
          activeOpacity={0.7}
          style={s.linkWrap}
        >
          <Text style={s.linkText}>
            Don't have an account? <Text style={s.linkBold}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.screenPadding + 10,
  },
  brand: {
    fontSize: 42,
    letterSpacing: -1,
    color: colors.paper,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 16,
    color: colors.paperDim,
    fontStyle: "italic",
    marginBottom: 48,
  },
  form: {
    gap: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: spacing.buttonRadius,
    backgroundColor: colors.bg2,
    color: colors.paper,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  error: {
    color: colors.red,
    fontSize: 13,
    marginTop: 2,
  },
  button: {
    backgroundColor: colors.amber,
    borderRadius: spacing.buttonRadius,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "600",
  },
  linkWrap: {
    marginTop: 28,
    alignItems: "center",
  },
  linkText: {
    color: colors.paperFaint,
    fontSize: 14,
  },
  linkBold: {
    color: colors.amber,
    fontWeight: "600",
  },
})
