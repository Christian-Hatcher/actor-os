import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}))

// Mock auth hook — unauthenticated state
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    loading: false,
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn(),
  }),
}))

// Mock supabase client
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}))

import LoginPage from "@/app/login/page"

describe("Login Page", () => {
  it("renders email input", () => {
    render(<LoginPage />)
    expect(screen.getByPlaceholderText("actor@example.com")).toBeInTheDocument()
  })

  it("renders password input", () => {
    render(<LoginPage />)
    expect(screen.getByPlaceholderText("Your password")).toBeInTheDocument()
  })

  it("renders submit button with correct text", () => {
    render(<LoginPage />)
    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument()
  })

  it("renders signup link", () => {
    render(<LoginPage />)
    expect(screen.getByText("Sign up")).toBeInTheDocument()
  })

  it("renders Actor OS branding", () => {
    render(<LoginPage />)
    expect(screen.getByText("Actor OS")).toBeInTheDocument()
  })

  it("renders welcome heading", () => {
    render(<LoginPage />)
    expect(screen.getByText("Welcome back")).toBeInTheDocument()
  })
})
