import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, User } from "lucide-react";
import { z } from "zod";
import HelloUniLogo from "@/assets/HelloUni_Logo.svg";

const usernameSchema = z.object({
  username: z.string()
    .trim()
    .min(3, 'Benutzername muss mindestens 3 Zeichen haben')
    .max(20, 'Benutzername darf maximal 20 Zeichen haben')
    .regex(/^[a-zA-Z0-9_]+$/, 'Nur Buchstaben, Zahlen und Unterstrich erlaubt')
});

const Onboarding = () => {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    setLoading(true);

    try {
      // Validate username
      const validated = usernameSchema.parse({ username });

      // Update profile with username and full_name
      const { error } = await supabase
        .from('profiles')
        .update({
          username: validated.username,
          full_name: fullName.trim() || null,
        })
        .eq('id', user.id);

      if (error) {
        if (error.code === '23505') {
          toast.error('Dieser Benutzername ist bereits vergeben');
          return;
        }
        throw error;
      }

      toast.success('Profil erfolgreich erstellt!');
      navigate('/home');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || 'Ein Fehler ist aufgetreten');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={HelloUniLogo} alt="HelloUni" className="h-16 w-auto" />
          </div>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <User className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Willkommen bei HelloUni!</CardTitle>
          <CardDescription>
            Erstelle dein Profil, um loszulegen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Benutzername *
              </label>
              <Input
                type="text"
                placeholder="max_mustermann"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                required
              />
              <p className="text-xs text-muted-foreground">
                3-20 Zeichen, nur Buchstaben, Zahlen und Unterstrich
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Vollständiger Name (optional)
              </label>
              <Input
                type="text"
                placeholder="Max Mustermann"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !username.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird erstellt...
                </>
              ) : (
                'Profil erstellen'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
