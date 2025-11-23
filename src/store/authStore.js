import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setProfile: (profile) => set({ profile }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      logout: () => {
        // Clear session token juga
        try {
          localStorage.removeItem("kekasi_session_token");
        } catch (e) {
          console.warn("Could not clear session token:", e);
        }

        set({
          user: null,
          profile: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // Getters
      isAdmin: () => {
        const { profile } = get();
        return profile?.role === "admin";
      },
    }),
    {
      name: "kekasi-auth", // localStorage key
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
