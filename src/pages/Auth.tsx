import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Mail, Lock } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Bitte gib deine E-Mail-Adresse ein');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/home`,
        },
      });

      if (error) throw error;

      setMagicLinkSent(true);
      toast.success('Magic Link wurde gesendet! Überprüfe deine E-Mails.');
    } catch (error: any) {
      toast.error(error.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignUp) {
      if (!email || !username || !password) {
        toast.error('Bitte fülle alle Felder aus');
        return;
      }
    } else {
      if (!username || !password) {
        toast.error('Bitte fülle alle Felder aus');
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
            data: {
              username: username,
            }
          },
        });

        if (error) throw error;
        toast.success('Account erstellt! Du kannst dich jetzt anmelden.');
        setIsSignUp(false);
        setPassword('');
        setEmail('');
        setUsername('');
      } else {
        // Lookup email by username
        const { data: profile, error: lookupError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', username)
          .single();

        if (lookupError || !profile) {
          toast.error('Benutzername nicht gefunden');
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: profile.email,
          password,
        });

        if (error) throw error;
        toast.success('Erfolgreich angemeldet!');
        navigate('/home');
      }
    } catch (error: any) {
      toast.error(error.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Überprüfe deine E-Mails</CardTitle>
            <CardDescription>
              Wir haben dir einen Magic Link an <strong>{email}</strong> gesendet. Klicke auf den Link, um dich anzumelden.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setMagicLinkSent(false)}
            >
              Andere E-Mail verwenden
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Willkommen zurück</CardTitle>
          <CardDescription>
            Wähle deine bevorzugte Anmeldemethode
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="magic-link" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="magic-link">
                <Mail className="h-4 w-4 mr-2" />
                Magic Link
              </TabsTrigger>
              <TabsTrigger value="password">
                <Lock className="h-4 w-4 mr-2" />
                Passwort
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="magic-link">
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="deine@email.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Wird gesendet...' : 'Magic Link senden'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="password">
              <form onSubmit={handlePasswordAuth} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-2">
                    <Input
                      type="email"
                      placeholder="E-Mail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Benutzername"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Passwort"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Wird geladen...' : (isSignUp ? 'Registrieren' : 'Anmelden')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setIsSignUp(!isSignUp)}
                  disabled={loading}
                >
                  {isSignUp ? 'Bereits ein Account? Anmelden' : 'Noch kein Account? Registrieren'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
