// hooks/useAuth.js
import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { supabase } from "../services/supabase";

export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    // Quick check - if already authenticated from localStorage, just verify
    if (store.isAuthenticated && store.user) {
      store.setLoading(false);
      return;
    }

    // Otherwise check session
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const username = session.user.user_metadata?.username;

          if (username) {
            const { data: profile } = await supabase.from("users").select("*").eq("username", username).single();

            if (profile) {
              store.setUser(session.user);
              store.setProfile(profile);
            }
          }
        }
      } catch (error) {
        console.error("Session error:", error);
      } finally {
        store.setLoading(false);
      }
    };

    checkSession();

    // Auth listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        store.logout();
      } else if (event === "SIGNED_IN" && session) {
        const username = session.user.user_metadata?.username;
        if (username) {
          supabase
            .from("users")
            .select("*")
            .eq("username", username)
            .single()
            .then(({ data: profile }) => {
              if (profile) {
                store.setUser(session.user);
                store.setProfile(profile);
              }
            });
        }
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← Add ESLint disable comment

  return {
    user: store.user,
    profile: store.profile,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    isAdmin: store.isAdmin(),
  };
}
