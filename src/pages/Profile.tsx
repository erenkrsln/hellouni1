import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navigation } from "@/components/Navigation";
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
import { SwipeableLayout } from "@/components/SwipeableLayout";

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface FollowStats {
  followers: number;
  following: number;
  isFollowing: boolean;
}

interface PostWithProfile {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  post_likes: { user_id: string }[];
  post_comments: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profiles: {
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  }[];
}

const Profile = () => {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followStats, setFollowStats] = useState<FollowStats>({ followers: 0, following: 0, isFollowing: false });
  const [followLoading, setFollowLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchFollowStats = async (profileId: string) => {
    if (!user) return;

    try {
      // Count followers
      const { count: followersCount } = await supabase
        .from("user_follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profileId);

      // Count following
      const { count: followingCount } = await supabase
        .from("user_follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profileId);

      // Check if current user follows this profile
      const { data: followData } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", profileId)
        .maybeSingle();

      setFollowStats({
        followers: followersCount || 0,
        following: followingCount || 0,
        isFollowing: !!followData,
      });
    } catch (error) {
      console.error("Error fetching follow stats:", error);
    }
  };

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
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      setProfile({ ...profile, avatar_url: urlData.publicUrl });
      toast({
        title: "Erfolg",
        description: "Avatar erfolgreich hochgeladen!",
      });
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: "Fehler beim Hochladen: " + error.message,
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
      if (followStats.isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profile.id);

        if (error) throw error;

        setFollowStats(prev => ({
          ...prev,
          followers: prev.followers - 1,
          isFollowing: false,
        }));

        toast({
          title: "Entfolgt",
          description: `Du folgst @${profile.username} nicht mehr`,
        });
      } else {
        // Follow
        const { error } = await supabase
          .from("user_follows")
          .insert({
            follower_id: user.id,
            following_id: profile.id,
          });

        if (error) throw error;

        setFollowStats(prev => ({
          ...prev,
          followers: prev.followers + 1,
          isFollowing: true,
        }));

        toast({
          title: "Gefolgt",
          description: `Du folgst jetzt @${profile.username}`,
        });
      }
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

  useEffect(() => {
    const fetchProfileAndPosts = async () => {
      if (!username) return;

      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, created_at")
          .eq("username", username)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profileData) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // Fetch follow stats
        await fetchFollowStats(profileData.id);

        // Fetch user's posts
        const { data: postsData, error: postsError } = await supabase
          .from("posts")
          .select("*")
          .eq("user_id", profileData.id)
          .order("created_at", { ascending: false });

        if (postsError) throw postsError;

        if (!postsData || postsData.length === 0) {
          setPosts([]);
          setLoading(false);
          return;
        }

        // Fetch likes
        const { data: likesData } = await supabase
          .from("post_likes")
          .select("post_id, user_id")
          .in("post_id", postsData.map(p => p.id));

        // Fetch comments with profiles
        const { data: commentsData } = await supabase
          .from("post_comments")
          .select("*")
          .in("post_id", postsData.map(p => p.id));

        // Fetch comment authors' profiles
        const commentUserIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
        const { data: commentProfilesData } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", commentUserIds);

        const profilesMap = new Map(commentProfilesData?.map(p => [p.id, p]) || []);
        const likesMap = new Map<string, any[]>();
        likesData?.forEach(like => {
          if (!likesMap.has(like.post_id)) {
            likesMap.set(like.post_id, []);
          }
          likesMap.get(like.post_id)!.push(like);
        });

        const commentsMap = new Map<string, any[]>();
        commentsData?.forEach(comment => {
          if (!commentsMap.has(comment.post_id)) {
            commentsMap.set(comment.post_id, []);
          }
          commentsMap.get(comment.post_id)!.push({
            ...comment,
            profiles: profilesMap.get(comment.user_id) || null,
          });
        });

        const enrichedPosts: PostWithProfile[] = postsData.map(post => ({
          ...post,
          profiles: profileData,
          post_likes: likesMap.get(post.id) || [],
          post_comments: commentsMap.get(post.id) || [],
        }));

        setPosts(enrichedPosts);
      } catch (error: any) {
        toast({
          title: "Fehler",
          description: error.message || "Ein Fehler ist aufgetreten",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndPosts();
  }, [username, toast]);

  const handlePostDeleted = () => {
    setPosts(posts.filter(p => p.user_id !== profile?.id));
  };

  const handlePostUpdated = async () => {
    if (!profile) return;
    
    // Refetch posts
    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });

    if (postsData) {
      // Simplified refetch - just reload the page data
      window.location.reload();
    }
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
        <Navigation />
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
    <SwipeableLayout>
      <div className="min-h-screen bg-background">
      <Navigation />
      
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
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <div>
                    <span className="font-semibold">{followStats.following}</span>
                    <span className="text-muted-foreground ml-1">Folge ich</span>
                  </div>
                  <div>
                    <span className="font-semibold">{followStats.followers}</span>
                    <span className="text-muted-foreground ml-1">Follower</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Beigetreten {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true, locale: de })}
                  </span>
                </div>
              </div>

              {/* Follow Button */}
              {!isOwnProfile && (
                <Button 
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  variant={followStats.isFollowing ? "outline" : "default"}
                  className="ml-auto"
                >
                  {followLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : followStats.isFollowing ? (
                    <>
                      <UserMinus className="h-4 w-4 mr-2" />
                      Entfolgen
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Folgen
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Posts Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {isOwnProfile ? "Deine Beiträge" : "Beiträge"}
          </h2>
          
          {posts.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {isOwnProfile 
                  ? "Du hast noch keine Beiträge erstellt."
                  : "Dieser Nutzer hat noch keine Beiträge erstellt."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <Post
                  key={post.id}
                  post={post}
                  currentUserId={user?.id || ""}
                  onPostDeleted={handlePostDeleted}
                  onPostUpdated={handlePostUpdated}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
    </SwipeableLayout>
  );
};

export default Profile;
