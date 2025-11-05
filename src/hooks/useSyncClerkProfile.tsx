import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { supabase } from "@/integrations/supabase/client";

export const useSyncClerkProfile = () => {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    const syncProfile = async () => {
      if (!isLoaded || !user) return;

      try {
        // Check if profile exists
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!existingProfile) {
          // Create profile if it doesn't exist
          const { error } = await supabase.from("profiles").insert({
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress || null,
            full_name: user.fullName || user.firstName || null,
            avatar_url: user.imageUrl || null,
          });

          if (error && error.code !== "23505") {
            // Ignore duplicate key errors
            console.error("Error creating profile:", error);
          }
        } else {
          // Update profile if it exists
          const { error } = await supabase
            .from("profiles")
            .update({
              email: user.primaryEmailAddress?.emailAddress || null,
              full_name: user.fullName || user.firstName || null,
              avatar_url: user.imageUrl || null,
            })
            .eq("id", user.id);

          if (error) {
            console.error("Error updating profile:", error);
          }
        }
      } catch (error) {
        console.error("Error syncing profile:", error);
      }
    };

    syncProfile();
  }, [user, isLoaded]);
};
