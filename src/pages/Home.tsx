import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { PostForm } from "@/components/PostForm";
import { Post } from "@/components/Post";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PostWithProfile {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profiles: {
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
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  }[];
}

const Home = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  const fetchPosts = async () => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      // Fetch profiles separately
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url");

      // Fetch likes
      const { data: likesData } = await supabase
        .from("post_likes")
        .select("post_id, user_id");

      // Fetch comments with profiles
      const { data: commentsData } = await supabase
        .from("post_comments")
        .select("*");

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
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
        profiles: profilesMap.get(post.user_id) || null,
        post_likes: likesMap.get(post.id) || [],
        post_comments: commentsMap.get(post.id) || [],
      }));

      setPosts(enrichedPosts);
    } catch (error: any) {
      toast({
        title: "Fehler beim Laden der Beiträge",
        description: error.message || "Ein Fehler ist aufgetreten",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user]);

  const handlePostCreated = () => {
    fetchPosts();
  };

  const handlePostDeleted = () => {
    fetchPosts();
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <PostForm onPostCreated={handlePostCreated} />
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Noch keine Beiträge vorhanden. Sei der Erste und erstelle einen!
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Post 
                key={post.id} 
                post={post} 
                currentUserId={user.id}
                onPostDeleted={handlePostDeleted}
                onPostUpdated={fetchPosts}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
