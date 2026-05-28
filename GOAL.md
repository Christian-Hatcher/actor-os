# Actor OS — Master Build Plan

This file is the single source of truth for everything that needs to happen to ship Actor OS as a testable native app. Read it top to bottom. Every task is ordered by dependency — do not skip ahead.

**Guiding principle:** This is an app. iPhone first, Android second, desktop third. Not a PWA. A real downloadable app via TestFlight (iOS) and internal testing (Android), built with Expo + React Native using the same Supabase backend.

---

## Table of Contents

1. [Accounts and Infrastructure](#1-accounts-and-infrastructure)
2. [Native App Setup (Expo)](#2-native-app-setup-expo)
3. [Port Web UI to React Native](#3-port-web-ui-to-react-native)
4. [Per-User LLM Provider Settings](#4-per-user-llm-provider-settings)
5. [Design Polish — Every Screen](#5-design-polish--every-screen)
6. [Onboarding Flow Completion](#6-onboarding-flow-completion)
7. [Beta Distribution (TestFlight and Android)](#7-beta-distribution-testflight-and-android)
8. [Desktop Web App](#8-desktop-web-app)
9. [Testing Plan](#9-testing-plan)
10. [Account Setup Checklist for Beta Testers](#10-account-setup-checklist-for-beta-testers)

---

## 1. Accounts and Infrastructure

### Already set up (no action needed)
- [x] Supabase project: `kyljaiwtijovnwajotoq` (Auth + Postgres + RLS + Storage)
- [x] Stripe: test mode with monthly ($5) and annual ($45) products
- [x] GitHub repo: Christian-Hatcher/actor-os
- [x] Vercel deployment: actor-os-gray.vercel.app (web version)
- [x] Google OAuth (Gmail integration): client ID + secret configured
- [x] Ollama Cloud account (Christian's — for LLM features)

### Accounts Christian needs to create
- [ ] **Apple Developer Account** ($99/year) at developer.apple.com — REQUIRED for TestFlight
  - Enroll under "At Home Reelz K.K." or as individual
  - Takes 24-48 hours to approve
  - Needed for: TestFlight beta distribution, App Store listing later
- [ ] **Expo Account** (free) at expo.dev — sign up, create org "actor-os"
  - Link to Apple Developer account via `eas credentials`
  - This is what builds the iOS/Android binaries in the cloud
- [ ] **Google Play Developer Account** ($25 one-time) at play.google.com/console — for Android internal testing track
  - Optional for MVP — can do Android later if iOS is priority
- [ ] **Supabase Storage bucket** — create a bucket called `self-tapes` in the Supabase dashboard (Storage → New Bucket → name: `self-tapes`, public: false)
- [ ] **Stripe coupon** — create `BETA100` in Stripe Dashboard (Billing → Coupons → 100% off, limited to 50 redemptions)

### Ollama Cloud setup for production
The LLM layer currently reads from environment variables. For production:
- Set these on Vercel (Environment Variables):
  ```
  LLM_LOW_PROVIDER=ollama
  LLM_LOW_MODEL=llama3.2:3b
  LLM_LOW_BASE_URL=https://<your-ollama-cloud-url>
  LLM_LOW_API_KEY=<your-ollama-cloud-key>
  LLM_HIGH_PROVIDER=ollama
  LLM_HIGH_MODEL=llama3.2:3b
  LLM_HIGH_BASE_URL=https://<your-ollama-cloud-url>
  LLM_HIGH_API_KEY=<your-ollama-cloud-key>
  ```
- Christian: replace `<your-ollama-cloud-url>` and `<your-ollama-cloud-key>` with your actual Ollama Cloud credentials

---

## 2. Native App Setup (Expo)

Actor OS becomes a native app using **Expo** (same stack as Tomodachi). The existing Next.js web app stays as the desktop version. The native app shares the same Supabase backend, same database, same auth — just a different frontend.

### Why Expo, not Capacitor/PWA
- Real native app in the App Store / Play Store
- Camera access for self-tape recording
- Push notifications for deadline reminders
- Same React/TypeScript skills, shared business logic
- Tomodachi already uses this stack — proven pattern
- EAS Build handles iOS/Android builds in the cloud (no Mac needed for CI)

### Directory structure
```
actor-os/
├── app/                    # NEW — Expo React Native app
│   ├── app/                # Expo Router file-based routing
│   │   ├── (tabs)/         # Bottom tab navigator
│   │   │   ├── index.tsx       # Today (dashboard home)
│   │   │   ├── auditions.tsx   # Auditions list
│   │   │   ├── tapes.tsx       # Self-tapes
│   │   │   ├── earnings.tsx    # Earnings + tax
│   │   │   └── me.tsx          # Settings/profile
│   │   ├── audition/[id].tsx   # Audition detail
│   │   ├── contracts.tsx       # Contracts
│   │   ├── outreach.tsx        # CRM
│   │   ├── emails.tsx          # Email review queue
│   │   ├── onboarding.tsx      # Onboarding wizard
│   │   └── _layout.tsx         # Root layout + auth guard
│   ├── components/         # React Native components
│   ├── hooks/              # Shared hooks (copy from src/hooks/)
│   ├── lib/                # Shared lib (copy from src/lib/)
│   ├── assets/             # App icons, splash screen
│   ├── app.json            # Expo config
│   ├── eas.json            # EAS Build config
│   ├── package.json
│   └── tsconfig.json
├── src/                    # EXISTING — Next.js web app (desktop)
├── supabase/               # Shared database schema
├── bible/                  # Product bible
└── GOAL.md                 # This file
```

### Step-by-step setup (can be coded without accounts)

```bash
# 1. Create the Expo app inside the repo
cd ~/actor-os
npx create-expo-app@latest app --template tabs
cd app

# 2. Install dependencies matching the web app
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage
npx expo install expo-camera expo-file-system expo-av expo-image-picker
npx expo install expo-secure-store expo-notifications expo-linking
npx expo install react-native-safe-area-context react-native-screens
npx expo install lucide-react-native react-native-svg

# 3. Copy shared code
cp ../src/lib/supabase.ts lib/supabase.ts    # Modify to use SecureStore
cp ../src/lib/briefing.ts lib/briefing.ts
cp ../src/lib/format.ts lib/format.ts
cp ../src/lib/ribbon.ts lib/ribbon.ts
cp ../src/lib/tax-estimator.ts lib/tax-estimator.ts
cp ../src/hooks/use-auth.tsx hooks/use-auth.tsx  # Modify for RN
cp ../src/hooks/use-data.tsx hooks/use-data.tsx
cp ../src/hooks/use-earnings.tsx hooks/use-earnings.tsx
cp ../src/hooks/use-tax.tsx hooks/use-tax.tsx
cp ../src/types/ types/
```

### Supabase client for React Native
The web app uses `@supabase/supabase-js` with browser localStorage. React Native needs `expo-secure-store`:

```typescript
// app/lib/supabase.ts
import { createClient } from "@supabase/supabase-js"
import * as SecureStore from "expo-secure-store"
import type { Database } from "../types/database"

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
```

### EAS config
```json
// app/eas.json
{
  "cli": { "version": ">= 9.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {
      "ios": { "appleId": "hatcher.actor@gmail.com" }
    }
  }
}
```

### app.json
```json
{
  "expo": {
    "name": "Actor OS",
    "slug": "actor-os",
    "version": "0.1.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "actoros",
    "userInterfaceStyle": "dark",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.athomereelz.actoros",
      "infoPlist": {
        "NSCameraUsageDescription": "Actor OS needs camera access to record self-tapes",
        "NSPhotoLibraryUsageDescription": "Actor OS needs photo library access to upload self-tapes"
      }
    },
    "android": {
      "package": "com.athomereelz.actoros",
      "adaptiveIcon": {
        "backgroundColor": "#0a0908",
        "foregroundImage": "./assets/adaptive-icon.png"
      }
    },
    "plugins": [
      "expo-router",
      "expo-camera",
      "expo-secure-store",
      ["expo-notifications", { "icon": "./assets/notification-icon.png" }]
    ]
  }
}
```

---

## 3. Port Web UI to React Native

Each web component needs a React Native equivalent. The business logic (hooks, lib/) is shared. Only the UI layer changes.

### Mapping: Web Component → React Native Component

| Web (Next.js + Tailwind) | React Native (Expo) | Priority |
|---|---|---|
| `dashboard-home.tsx` → greeting, briefing, accordion | `(tabs)/index.tsx` — ScrollView, Text, briefing card | P0 |
| `auditions-view.tsx` → list + calendar + create sheet | `(tabs)/auditions.tsx` — FlatList, bottom sheet modal | P0 |
| `audition-detail.tsx` → call sheet + status switcher | `audition/[id].tsx` — ScrollView, status buttons | P0 |
| `self-tapes-view.tsx` → tape cards + upload | `(tabs)/tapes.tsx` — expo-camera, expo-image-picker | P0 |
| `earnings-view.tsx` → chart + goal + tax | `(tabs)/earnings.tsx` — react-native-svg for charts | P1 |
| `tax-keeper.tsx` → tax tracking | Part of earnings tab | P1 |
| `contracts/page.tsx` → paste + analysis | `contracts.tsx` — TextInput + analysis display | P1 |
| `outreach/page.tsx` → contact list | `outreach.tsx` — FlatList + contact cards | P1 |
| `emails/page.tsx` → review queue | `emails.tsx` — approval cards + swipe actions | P1 |
| `settings/page.tsx` → all settings | `(tabs)/me.tsx` — sections for profile, LLM, theme, subscription | P0 |
| `onboarding/page.tsx` → wizard | `onboarding.tsx` — step wizard with PagerView | P0 |
| `splash.tsx` → cold-open animation | Expo SplashScreen + custom animated view | P2 |
| `bottom-nav.tsx` → tab bar | Expo Router `(tabs)/_layout.tsx` — built-in tab bar | P0 |

### Design tokens in React Native
Create a shared theme file:
```typescript
// app/lib/theme.ts
export const colors = {
  bg: "#0a0908",
  bg2: "#141210",
  bg3: "#1c1916",
  paper: "#f4efe6",
  paperDim: "#a8a298",
  paperFaint: "#6e6a62",
  rule: "#26231f",
  ruleStrong: "#36322c",
  green: "#3aa86b",
  amber: "#e8a755",
  blue: "#6ab3e8",
  red: "#e8625a",
  purple: "#b69de0",
}

export const fonts = {
  serif: "InstrumentSerif-Regular",
  serifItalic: "InstrumentSerif-Italic",
  sans: "Inter-Regular",
  sansMedium: "Inter-Medium",
  sansBold: "Inter-Bold",
  mono: "JetBrainsMono-Regular",
}
```

### What can be coded WITHOUT any accounts
Everything in this section. The Expo app scaffold, all React Native components, all shared hooks/lib, the theme system, the tab navigator, the onboarding flow, the settings page with LLM config — all of this is pure code that runs locally on the Expo dev client or simulator.

---

## 4. Per-User LLM Provider Settings

Currently, LLM config is server-side env vars. For per-user keys, we need:

### Database change
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS llm_provider text DEFAULT 'ollama';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS llm_model text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS llm_base_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS llm_api_key_encrypted text;
```

### Settings UI — "AI Connection" section
Add to the Settings/Me page:
- **Provider picker:** Ollama Cloud (default) / Anthropic / OpenAI / None
- **API key input:** password field, saved encrypted to profile
- **Model selector:** auto-populated based on provider
  - Ollama: llama3.2:3b, llama3.1:8b, etc.
  - Anthropic: claude-sonnet-4-20250514, claude-haiku-4-5-20251001
  - OpenAI: gpt-4o-mini, gpt-4o
- **Base URL:** editable for Ollama Cloud (custom endpoint)
- **Test connection button:** makes a tiny test call and shows success/failure
- **"What is this?"** explainer text: "Actor OS uses AI to analyze contracts, parse casting emails, and write your morning briefing. Connect your own AI provider, or use the default."

### How it works at runtime
1. API routes (contract analysis, email parsing, briefing) read user's profile
2. If user has their own LLM config → use their keys
3. If not → fall back to system env vars (Christian's Ollama Cloud)
4. This means beta testers get AI for free (using the system default) but power users can bring their own keys

### Modify `src/lib/llm.ts`
Add a new function signature:
```typescript
export async function llmForUser(
  tier: LLMTier,
  userId: string,
  messages: LLMMessage[],
  maxTokens?: number
): Promise<LLMResponse>
```
This function:
1. Fetches user profile from Supabase (cached)
2. If user has `llm_provider` set → builds config from their profile fields
3. Else → uses system env vars (existing `getConfig()`)
4. Calls the appropriate provider

### Security
- API keys stored encrypted in the database (use Supabase vault or pgcrypto)
- Keys are NEVER sent to the client — only used server-side in API routes
- RLS ensures users can only read their own row

---

## 5. Design Polish — Every Screen

The cinematic design system (dark theme, amber accents, Instrument Serif headings, JetBrains Mono metadata) must be consistent across ALL screens. Currently some screens still have generic shadcn styling.

### Checklist — apply cinematic design to each

- [ ] **Landing page** — DONE (cinematic redesign shipped)
- [ ] **Login page** — needs cinematic background, serif heading, amber focus rings
- [ ] **Signup page** — same as login
- [ ] **Onboarding** — verify all 6 steps use design tokens, not hardcoded colors
- [ ] **Dashboard home** — DONE (cinematic)
- [ ] **Auditions list** — verify agenda view uses serif dates, mono metadata, amber active states
- [ ] **Audition detail** — verify call-sheet card, ribbon colors, status switcher
- [ ] **Self-tapes** — verify tape cards, upload progress, deadline urgency colors
- [ ] **Earnings** — verify chart colors use green/amber/red, goal ring, tax section
- [ ] **Contracts** — verify analysis cards, red flag callouts, grade display
- [ ] **Outreach** — verify contact cards, priority stars, last-contact dates
- [ ] **Emails** — verify review queue cards, confidence badges, approve/skip buttons
- [ ] **Settings** — verify all sections use consistent card styling, toggle buttons
- [ ] **Checkout** — needs cinematic redesign (currently generic white card)

### Design rules (for every screen)
1. Background: `var(--bg)` (#0a0908)
2. Cards: `var(--bg2)` with `border-rule` and `rounded-[14px]`
3. Headings: `font-serif` (Instrument Serif)
4. Body text: `font-sans` (Inter)
5. Metadata/labels: `font-mono` (JetBrains Mono), uppercase, tracking-widest
6. Primary accent: `var(--amber)` (#e8a755)
7. Success: `var(--green)` (#3aa86b)
8. Danger/urgent: `var(--red)` (#e8625a)
9. Info/passive: `var(--blue)` (#6ab3e8)
10. Buttons: rounded-[10px] or rounded-[30px] pill, amber fill for primary CTA
11. No hardcoded hex values — always CSS variables
12. Status chips: mono font, uppercase, colored by status

---

## 6. Onboarding Flow Completion

The onboarding wizard exists but needs verification and polish.

### Steps to verify
- [ ] Step 1 (Name): pre-fills from signup, avatar upload works
- [ ] Step 2 (Career): city is required, mode toggle saves
- [ ] Step 3 (Goals): currency selector works, goal saves to profile
- [ ] Step 4 (Email): Gmail OAuth redirect works, skip works
- [ ] Step 5 (Theme): all themes preview correctly, selection saves
- [ ] Step 6 (Done): summary is accurate, redirect to dashboard works
- [ ] Auth guard: users without city are redirected to onboarding
- [ ] Users WITH city skip onboarding and go straight to dashboard

### Missing onboarding items to add
- [ ] **Agency connection** — if user enters agency email, send them a welcome note (future)
- [ ] **Import existing data** — "Do you have auditions to import?" with CSV upload option (future)
- [ ] **Notification preferences** — push notification permission request (native app only)

---

## 7. Beta Distribution (TestFlight and Android)

### iOS — TestFlight (primary)

This is how apps like Clubhouse distributed their beta. TestFlight lets you invite up to 10,000 external testers via a public link.

**Prerequisites:**
1. Apple Developer account ($99/year) — MUST be enrolled
2. Expo account linked to Apple credentials
3. App bundle identifier: `com.athomereelz.actoros`

**Steps:**
```bash
# 1. Login to EAS
cd ~/actor-os/app
npx eas-cli login

# 2. Configure Apple credentials
npx eas credentials --platform ios

# 3. Build for TestFlight
npx eas build --platform ios --profile preview

# 4. Submit to TestFlight
npx eas submit --platform ios

# 5. In App Store Connect:
#    - Add beta testers by email, OR
#    - Create a public TestFlight link (anyone with the link can install)
#    - The public link is what you share with beta testers
```

**What testers see:**
1. They get a TestFlight link (like `https://testflight.apple.com/join/XXXXXX`)
2. They install TestFlight from the App Store (free)
3. They tap the link → installs Actor OS
4. It looks and feels like a real app — icon on home screen, push notifications, everything

### Android — Internal Testing

```bash
# Build for Android
npx eas build --platform android --profile preview

# Submit to Google Play internal testing track
npx eas submit --platform android
```

Or for quick sharing without Play Store:
```bash
# Build an APK (sideload)
npx eas build --platform android --profile preview --local
# Share the .apk file directly — testers install it manually
```

### Beta tester onboarding flow
1. Christian creates their Supabase auth account (or they self-register)
2. Christian sets their profile to `subscription_tier: 'annual', subscription_status: 'active'` (or they use BETA100 coupon)
3. Christian sends them the TestFlight link
4. They install, open, login with their email/password
5. Onboarding wizard guides them through setup
6. They're in

---

## 8. Desktop Web App

The Next.js web app at actor-os-gray.vercel.app serves as the desktop version. It's secondary to the native app but needs to work well on desktop browsers.

### Already done
- [x] Desktop sidebar (240px, 8 nav items)
- [x] Bottom nav hidden on desktop
- [x] Content area max-w-[800px] centered
- [x] Cinematic landing page

### Still needed
- [ ] **Login/signup pages** — cinematic design (currently generic)
- [ ] **Checkout page** — cinematic design
- [ ] **Responsive breakpoints** — verify all dashboard pages look good at 1024px-1920px
- [ ] **Keyboard navigation** — tab through forms, Enter to submit
- [ ] **Desktop-specific features** — wider cards, multi-column layouts where it makes sense

---

## 9. Testing Plan

### Automated tests to write
- [ ] **Auth flow:** signup → onboarding → dashboard redirect
- [ ] **Audition CRUD:** create, read, update status, delete
- [ ] **Self-tape upload:** file picker → Supabase Storage → video_url saved
- [ ] **Contract analysis:** paste text → API call → analysis displayed
- [ ] **Earnings calculation:** audition data → correct banked/potential/tax
- [ ] **LLM provider switching:** user config → correct provider called
- [ ] **Stripe checkout:** plan selection → coupon code → Stripe session
- [ ] **Gmail sync:** OAuth → token storage → email fetch → parsing

### Manual QA checklist (for each beta tester session)
- [ ] Can sign up with email/password
- [ ] Onboarding completes without errors
- [ ] Dashboard shows correct time-of-day greeting
- [ ] Can create an audition with all fields
- [ ] Can change audition status
- [ ] Can upload a self-tape video
- [ ] Can paste contract text and see AI analysis
- [ ] Earnings page shows correct calculations
- [ ] Tax keeper tracks set-asides
- [ ] Settings: can change theme, currency, preferences
- [ ] Settings: can configure LLM provider (if they have keys)
- [ ] App works offline (cached data, queued writes) — FUTURE
- [ ] Push notifications for deadlines — FUTURE

---

## 10. Account Setup Checklist for Beta Testers

### What Christian does for each tester
1. **Option A — self-service:**
   - Share signup URL + BETA100 coupon code
   - They sign up, enter coupon at checkout, and are fully activated
2. **Option B — Christian creates account:**
   ```bash
   # Create user via Supabase admin API
   source .env.local
   export $(grep -v '^#' .env.local | grep '=' | xargs)

   # Create auth user
   curl -X POST -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"email":"tester@example.com","password":"TempPass123!","email_confirm":true}' \
     "${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users"

   # Get user ID from response, then activate
   curl -X PATCH -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"subscription_tier":"annual","subscription_status":"active"}' \
     "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.<USER_ID>"
   ```
3. Send them:
   - TestFlight link (iOS) or APK (Android) or web URL (desktop)
   - Their login email + temporary password
   - A 30-second video showing: open app → login → tap around

### Free tier for beta
All beta testers get annual tier for free. No Stripe charges. The BETA100 coupon or manual profile update handles this.

### LLM for beta testers (no cost to them)
- System default uses Christian's Ollama Cloud keys (set in Vercel env vars)
- Beta testers get AI features for free — contract analysis, email parsing, briefing
- If a tester has their own Ollama/Anthropic/OpenAI key, they can add it in Settings → AI Connection
- If they don't, the system falls back to the shared key

---

## Execution Order

### Can be coded RIGHT NOW (no accounts needed)
1. Expo app scaffold (`npx create-expo-app`)
2. All React Native components (port from web)
3. Shared hooks/lib (copy + adapt)
4. Per-user LLM settings (database migration + API + settings UI)
5. Design polish on all web pages
6. Login/signup/checkout cinematic redesign
7. Automated tests

### Needs Apple Developer Account first
8. EAS Build for iOS
9. TestFlight submission
10. Public TestFlight link generation

### Needs Google Play Account first
11. EAS Build for Android
12. Internal testing track submission

---

*This file is the contract. Work through it section by section. Do not skip. Do not improvise. Build what's written.*
