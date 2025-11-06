import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { z } from "zod";

interface PostProps {
  post: {
    id: string;
    content: string;
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
  };
  currentUserId: string;
  onPostDeleted: () => void;
  onPostUpdated: () => void;
}

const commentSchema = z.object({
  content: z.string()
    .trim()
    .min(1, 'Kommentar darf nicht leer sein')
    .max(2000, 'Kommentar zu lang (max 2.000 Zeichen)')
});

export const Post = ({ post, currentUserId, onPostDeleted, onPostUpdated }: PostProps) => {
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [optimisticLikes, setOptimisticLikes] = useState<{ user_id: string }[] | null>(null);
  
  const currentLikes = optimisticLikes || post.post_likes;
  const isLiked = currentLikes.some(like => like.user_id === currentUserId);
  const likesCount = currentLikes.length;
  const commentsCount = post.post_comments.length;
  const isOwnPost = post.user_id === currentUserId;

  const handleLike = async () => {
    const wasLiked = isLiked;
    
    // Optimistic update
    if (wasLiked) {
      setOptimisticLikes(currentLikes.filter(like => like.user_id !== currentUserId));
    } else {
      setOptimisticLikes([...currentLikes, { user_id: currentUserId }]);
    }

    try {
      if (wasLiked) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", currentUserId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_likes")
          .insert({ post_id: post.id, user_id: currentUserId });
        
        if (error) throw error;
      }
      
      // Success - reset optimistic state and sync with DB
      setOptimisticLikes(null);
      onPostUpdated();
    } catch (error: any) {
      // Revert optimistic update on error
      setOptimisticLikes(null);
      toast({
        title: "Fehler",
        description: error.message || "Ein Fehler ist aufgetreten",
        variant: "destructive",
      });
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    
    setLoading(true);
    try {
      const validated = commentSchema.parse({ content: commentText });
      
      const { error } = await supabase
        .from("post_comments")
        .insert({
          post_id: post.id,
          content: validated.content,
          user_id: currentUserId,
        });
      
      if (error) throw error;
      
      setCommentText("");
      onPostUpdated();
      toast({
        title: "Erfolg",
        description: "Kommentar wurde hinzugefügt",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validierungsfehler",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Fehler",
          description: error.message || "Ein Fehler ist aufgetreten",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id)
        .eq("user_id", currentUserId);
      
      if (error) throw error;
      
      toast({
        title: "Erfolg",
        description: "Beitrag wurde gelöscht",
      });
      onPostDeleted();
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Ein Fehler ist aufgetreten",
        variant: "destructive",
      });
    }
  };

  const handleShare = () => {
    toast({
      title: "Teilen",
      description: "Diese Funktion wird bald verfügbar sein",
    });
  };

  return (
    <Card className="p-4 space-y-4">
      {/* Post Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>
              {post.profiles?.full_name?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{post.profiles?.full_name || "Unbekannter Nutzer"}</p>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: de })}
            </p>
          </div>
        </div>
        
        {isOwnPost && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Beitrag löschen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Löschen</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Post Content */}
      <p className="text-foreground whitespace-pre-wrap">{post.content}</p>

      {/* Post Actions */}
      <div className="flex items-center gap-1 pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className={isLiked ? "text-red-500" : ""}
        >
          <Heart className={`h-4 w-4 mr-1 ${isLiked ? "fill-current" : ""}`} />
          {likesCount > 0 && <span className="text-xs">{likesCount}</span>}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          {commentsCount > 0 && <span className="text-xs">{commentsCount}</span>}
        </Button>

        <Button variant="ghost" size="sm" onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-1" />
        </Button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="space-y-3 pt-3 border-t">
          <div className="flex gap-2">
            <Textarea
              placeholder="Schreibe einen Kommentar..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="min-h-[60px] resize-none"
              disabled={loading}
            />
            <Button onClick={handleComment} disabled={loading || !commentText.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Senden"}
            </Button>
          </div>

          {post.post_comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {comment.profiles?.full_name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 bg-muted rounded-lg p-3">
                <p className="font-semibold text-sm">
                  {comment.profiles?.full_name || "Unbekannter Nutzer"}
                </p>
                <p className="text-sm">{comment.content}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: de })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
