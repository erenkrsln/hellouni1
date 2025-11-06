import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { PostForm } from "@/components/PostForm";
import { Post } from "@/components/Post";
import { Loader2 } from "lucide-react";
import { useSyncClerkProfile } from "@/hooks/useSyncClerkProfile";
import { useClerkSupabaseProxy } from "@/lib/clerkSupabase";

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
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const proxy = useClerkSupabaseProxy();
  
  // Sync Clerk profile to Supabase
  useSyncClerkProfile();

  useEffect(() => {
    if (isLoaded && !user) {
      navigate("/");
    }
  }, [user, isLoaded, navigate]);

  const fetchPosts = async () => {
    try {
      const postsResult = await proxy.from("posts").select(
        "*, profiles!posts_user_id_fkey(full_name, avatar_url), post_likes(user_id), post_comments(id, content, created_at, user_id, profiles!post_comments_user_id_fkey(full_name, avatar_url))",
        { column: 'created_at', ascending: false }
      );

      if (!postsResult.data) {
        setPosts([]);
        return;
      }

      setPosts(postsResult.data);
    } catch (error: any) {
      console.error("Error fetching posts:", error);
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

  if (!isLoaded || !user) {
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
