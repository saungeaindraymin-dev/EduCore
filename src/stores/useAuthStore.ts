import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/lib/api/auth";

type AuthState = {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setSession: (payload: { token: string; user: User }) => void;
  setUser: (user: User) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setSession: ({ token, user }) =>
        set({ token, user, isAuthenticated: true }),

      setUser: (user) => set({ user }),

      logout: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      name: "educore-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        token: s.token,
        user: s.user,
        isAuthenticated: s.isAuthenticated,
      }),
    },
  ),
);

// Helper for routing based on role
export function dashboardPathFor(role: User["role"]) {
  switch (role) {
    case "admin":
      return "/dashboard";
    case "teacher":
      return "/teacher";
    case "student":
      return "/student";
  }
}
