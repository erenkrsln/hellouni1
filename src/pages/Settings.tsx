import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { SwipeableLayout } from "@/components/SwipeableLayout";

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<{
    username: string;
    full_name: string;
    avatar_url: string | null;
  }>({
    username: "",
    full_name: "",
    avatar_url: null,
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth?mode=login");
      return;
    }

    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("username, full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      toast.error("Fehler beim Laden des Profils");
      return;
    }

    if (data) {
      setProfile({
        username: data.username || "",
        full_name: data.full_name || "",
        avatar_url: data.avatar_url,
      });
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${user!.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split("/").pop();
        if (oldPath) {
          await supabase.storage.from("avatars").remove([`${user!.id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", user!.id);

      if (updateError) {
        throw updateError;
      }

      setProfile({ ...profile, avatar_url: urlData.publicUrl });
      toast.success("Avatar erfolgreich hochgeladen!");
    } catch (error: any) {
      toast.error("Fehler beim Hochladen: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from("profiles")
        .update({
          username: profile.username,
          full_name: profile.full_name,
        })
        .eq("id", user!.id);

      if (error) throw error;

      toast.success("Profil erfolgreich aktualisiert!");
    } catch (error: any) {
      toast.error("Fehler beim Speichern: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SwipeableLayout>
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Navigation />
        
        <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Einstellungen</h1>
              <p className="text-muted-foreground">
                Verwalte deine Profil-Einstellungen
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Profilbild</CardTitle>
                <CardDescription>
                  Lade ein Profilbild hoch oder ändere dein bestehendes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-24 w-24">
                    {profile.avatar_url && (
                      <AvatarImage src={profile.avatar_url} alt="Avatar" />
                    )}
                    <AvatarFallback className="text-2xl">
                      {profile.full_name?.[0]?.toUpperCase() ||
                       profile.username?.[0]?.toUpperCase() ||
                       user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Label htmlFor="avatar" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 w-fit">
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        <span>{uploading ? "Wird hochgeladen..." : "Avatar hochladen"}</span>
                      </div>
                    </Label>
                    <Input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      JPG, PNG oder WEBP. Max 2MB.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profil-Informationen</CardTitle>
                <CardDescription>
                  Aktualisiere deine persönlichen Informationen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Benutzername</Label>
                  <Input
                    id="username"
                    value={profile.username}
                    onChange={(e) =>
                      setProfile({ ...profile, username: e.target.value })
                    }
                    placeholder="deinbenutzername"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Vollständiger Name</Label>
                  <Input
                    id="full_name"
                    value={profile.full_name}
                    onChange={(e) =>
                      setProfile({ ...profile, full_name: e.target.value })
                    }
                    placeholder="Dein Name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    Die E-Mail-Adresse kann nicht geändert werden
                  </p>
                </div>

                <Button onClick={handleSaveProfile} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird gespeichert...
                    </>
                  ) : (
                    "Änderungen speichern"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>

        <BottomNavigation />
      </div>
    </SwipeableLayout>
  );
}
