import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Image, Loader2 } from "lucide-react";

interface PostFormProps {
  onPostCreated: () => void;
}

export const PostForm = ({ onPostCreated }: PostFormProps) => {
  const { user } = useUser();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte gib einen Text ein",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("posts").insert({
        user_id: user?.id,
        content: content.trim(),
      });

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Beitrag wurde erstellt",
      });
      
      setContent("");
      onPostCreated();
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          placeholder={`Was gibt's Neues, ${user?.firstName || ""}?`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px] resize-none"
          disabled={loading}
        />
        
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" size="icon" disabled>
            <Image className="h-5 w-5" />
          </Button>
          
          <Button type="submit" disabled={loading || !content.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird gepostet...
              </>
            ) : (
              "Posten"
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
};
