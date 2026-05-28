import { Tabs } from "expo-router"
import { Platform } from "react-native"
import { Home, Clapperboard, Video, BarChart3, User } from "lucide-react-native"
import { colors } from "@/lib/theme"

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.rule,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.paperFaint,
        tabBarLabelStyle: {
          fontSize: 10,
          letterSpacing: 0.4,
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="auditions"
        options={{
          title: "Auditions",
          tabBarIcon: ({ color, size }) => <Clapperboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tapes"
        options={{
          title: "Tapes",
          tabBarIcon: ({ color, size }) => <Video size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "Earnings",
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: "Me",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
