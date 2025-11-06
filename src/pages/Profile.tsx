import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navigation } from "@/components/Navigation";
import { Post } from "@/components/Post";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
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
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl">
                  {profile.full_name?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{profile.full_name || "Unbekannt"}</h1>
                <p className="text-muted-foreground">@{profile.username || "unbekannt"}</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Beigetreten {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true, locale: de })}
                  </span>
                </div>
              </div>
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
