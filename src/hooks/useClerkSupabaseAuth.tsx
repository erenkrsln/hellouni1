import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { supabase } from "@/integrations/supabase/client";

export const useClerkSupabaseAuth = () => {
  const { getToken, isLoaded, userId } = useAuth();

  useEffect(() => {
    const syncAuth = async () => {
      if (!isLoaded) return;

      try {
        if (userId) {
          // Get the Supabase JWT token from Clerk
          const token = await getToken({ template: "supabase" });
          
          if (token) {
            // Set the Supabase session with the Clerk JWT
            const { error } = await supabase.auth.setSession({
              access_token: token,
              refresh_token: token,
            });

            if (error) {
              console.error("Error setting Supabase session:", error);
            }
          }
        } else {
          // User is signed out, clear Supabase session
          await supabase.auth.signOut();
        }
      } catch (error) {
        console.error("Error syncing Clerk auth with Supabase:", error);
      }
    };

    syncAuth();
  }, [getToken, isLoaded, userId]);
};
