import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Image, Loader2 } from "lucide-react";
import { z } from "zod";
import { useEdgeFunctionAuth } from "@/lib/edgeFunctions";

interface PostFormProps {
  onPostCreated: () => void;
}

const postSchema = z.object({
  content: z.string()
    .trim()
    .min(1, 'Beitrag darf nicht leer sein')
    .max(5000, 'Beitrag zu lang (max 5.000 Zeichen)')
});

export const PostForm = ({ onPostCreated }: PostFormProps) => {
  const { user } = useUser();
  const { toast } = useToast();
  const { callEdgeFunction } = useEdgeFunctionAuth();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || !user) return;

    setLoading(true);
    try {
      // Validate input
      const validated = postSchema.parse({ content });

      await callEdgeFunction('posts', {
        method: 'CREATE',
        content: validated.content,
      });

      setContent("");
      toast({
        title: "Erfolg",
        description: "Beitrag wurde erstellt",
      });
      onPostCreated();
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
          description: error.message,
          variant: "destructive",
        });
      }
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
