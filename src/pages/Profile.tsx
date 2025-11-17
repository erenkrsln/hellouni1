import { useState } from "react";
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
import { useProfileByUsername } from "@/hooks/useProfile";
import { useUserPosts } from "@/hooks/usePosts";
import { useFollowStats } from "@/hooks/useFollowStats";
import { useQueryClient } from "@tanstack/react-query";

const Profile = () => {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [followLoading, setFollowLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading: profileLoading } = useProfileByUsername(username);
  const { data: posts = [], isLoading: postsLoading } = useUserPosts(profile?.id);
  const { data: followStats } = useFollowStats(profile?.id, user?.id);
  
  const loading = profileLoading;
  const notFound = !profileLoading && !profile;


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
  );
};

export default Profile;
