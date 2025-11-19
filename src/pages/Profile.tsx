import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Post } from "@/components/Post";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, ArrowLeft, UserPlus, UserMinus } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { useProfileByUsername } from "@/hooks/useProfile";
import { useUserPosts } from "@/hooks/usePosts";
import { useFollowStats } from "@/hooks/useFollowStats";
import { useQueryClient } from "@tanstack/react-query";

const Profile = () => {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [followLoading, setFollowLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading: profileLoading } = useProfileByUsername(username);
  const { data: posts = [], isLoading: postsLoading } = useUserPosts(profile?.id);
  const { data: followStats, isLoading: followStatsLoading } = useFollowStats(profile?.id, user?.id);
  
  const loading = profileLoading;
  const notFound = !profileLoading && !profile;

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !profile) return;

    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split("/").pop();
        if (oldPath) {
          await supabase.storage.from("avatars").remove([`${user.id}/${oldPath}`]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast({
        title: "Erfolg",
        description: "Profilbild wurde aktualisiert",
      });

      // Force refresh by navigating away and back
      const currentPath = location.pathname;
      navigate("/temp");
      setTimeout(() => navigate(currentPath), 0);
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Hochladen des Avatars",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!user || !profile) return;
    setFollowLoading(true);

    try {
      if (followStats?.isFollowing) {
        const { error } = await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profile.id);

        if (error) throw error;

        toast({
          title: "Nicht mehr gefolgt",
          description: `Du folgst ${profile.full_name || profile.username} nicht mehr`,
        });
      } else {
        const { error } = await supabase.from("user_follows").insert({
          follower_id: user.id,
          following_id: profile.id,
        });

        if (error) throw error;

        toast({
          title: "Gefolgt",
          description: `Du folgst jetzt ${profile.full_name || profile.username}`,
        });
      }

      // Invalidate follow stats
      queryClient.invalidateQueries({ queryKey: ['followStats', profile?.id] });
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Ein Fehler ist aufgetreten",
        variant: "destructive",
      });
    } finally {
      setFollowLoading(false);
    }
  };

  const handlePostDeleted = () => {
    queryClient.invalidateQueries({ queryKey: ['posts', 'user', profile?.id] });
  };

  const handlePostUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['posts', 'user', profile?.id] });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container max-w-2xl mx-auto px-4 py-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <h2 className="text-2xl font-bold mb-2">Profil nicht gefunden</h2>
              <p className="text-muted-foreground mb-4">
                Der Benutzer @{username} existiert nicht.
              </p>
              <Button onClick={() => navigate("/home")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück zur Startseite
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!profile) return null;

  const isOwnProfile = user?.id === profile.id;

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/home")}
              className="mb-4 w-fit"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
            <div className="flex items-start gap-4">
              <div className="relative">
                <Label htmlFor={isOwnProfile ? "avatar-upload" : undefined} className={isOwnProfile ? "cursor-pointer" : ""}>
                  <Avatar className={`h-20 w-20 ${isOwnProfile ? "hover:opacity-80 transition-opacity" : ""}`}>
                    {profile.avatar_url && (
                      <AvatarImage src={profile.avatar_url} alt="Avatar" />
                    )}
                    <AvatarFallback className="text-2xl">
                      {profile.full_name?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {isOwnProfile && uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                </Label>
                {isOwnProfile && (
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{profile.full_name || "Unbekannt"}</h1>
                <p className="text-muted-foreground">@{profile.username || "unbekannt"}</p>
                
                {/* Follow Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex flex-col items-center">
                    {followStatsLoading ? (
                      <div className="h-6 w-12 bg-muted animate-pulse rounded" />
                    ) : (
                      <span className="font-semibold">{followStats?.followers || 0}</span>
                    )}
                    <span className="text-muted-foreground">Follower</span>
                  </div>
                  <div className="flex flex-col items-center">
                    {followStatsLoading ? (
                      <div className="h-6 w-12 bg-muted animate-pulse rounded" />
                    ) : (
                      <span className="font-semibold">{followStats?.following || 0}</span>
                    )}
                    <span className="text-muted-foreground">Following</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Dabei seit{" "}
                    {formatDistanceToNow(new Date(profile.created_at), {
                      addSuffix: true,
                      locale: de,
                    })}
                  </span>
                </div>
              </div>
              {profile.id !== user?.id && (
                <Button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  variant={followStats?.isFollowing ? "outline" : "default"}
                  className="flex items-center gap-2"
                >
                  {followLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : followStats?.isFollowing ? (
                    <>
                      <UserMinus className="h-4 w-4" />
                      Nicht mehr folgen
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Folgen
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Posts */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Posts</h2>
          <div className="space-y-6">
            {postsLoading && posts.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : posts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Noch keine Posts vorhanden
              </p>
            ) : (
              posts.map((post) => (
                <Post
                  key={post.id}
                  post={post}
                  currentUserId={user?.id}
                  onPostDeleted={handlePostDeleted}
                  onPostUpdated={handlePostUpdated}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
