import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { PostForm } from "@/components/PostForm";
import { Post } from "@/components/Post";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePosts } from "@/hooks/usePosts";
import { useProfile } from "@/hooks/useProfile";
import { useQueryClient } from "@tanstack/react-query";

const Home = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [checkingProfile, setCheckingProfile] = useState(true);
  
  const { data: userProfile } = useProfile(user?.id);
  const { data: posts = [], isLoading: postsLoading } = usePosts();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile?.username) {
          navigate('/onboarding');
        }
      } catch (error) {
        // Silent fail
      } finally {
        setCheckingProfile(false);
      }
    };

    if (user) {
      checkProfile();
    }
  }, [user, navigate]);

  const handlePostCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  const handlePostDeleted = () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  if (authLoading || checkingProfile || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <PostForm onPostCreated={handlePostCreated} />
        
        {postsLoading && posts.length === 0 ? (
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
                onPostUpdated={handlePostDeleted}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
