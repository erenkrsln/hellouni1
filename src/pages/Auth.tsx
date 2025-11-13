import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { UserCircle, Mail } from 'lucide-react';
import { z } from 'zod';

const passwordSchema = z.string().min(6, 'Passwort muss mindestens 6 Zeichen haben');

const Auth = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'login';
  const isLogin = mode === 'login';

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      // Check if user has completed onboarding
      supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.username) {
            navigate('/home');
          } else {
            navigate('/onboarding');
          }
        });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('Bitte fülle alle Felder aus');
      return;
    }

    setLoading(true);

    try {
      // Lookup email by username
      const { data: profile, error: lookupError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', username)
        .maybeSingle();

      if (lookupError || !profile) {
        toast.error('Benutzername oder Passwort ungültig');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Benutzername oder Passwort ungültig');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Erfolgreich angemeldet!');
    } catch (error: any) {
      toast.error(error.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      toast.error('Bitte fülle alle Felder aus');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }

    try {
      passwordSchema.parse(password);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('Diese E-Mail ist bereits registriert');
        } else {
          throw error;
        }
        return;
      }

      if (data.user) {
        toast.success('Registrierung erfolgreich!');
        // User will be redirected to onboarding by the useEffect
      }
    } catch (error: any) {
      toast.error(error.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    const newMode = isLogin ? 'signup' : 'login';
    navigate(`/auth?mode=${newMode}`);
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            {isLogin ? (
              <UserCircle className="h-6 w-6 text-primary" />
            ) : (
              <Mail className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isLogin ? 'Willkommen zurück' : 'Registrieren'}
          </CardTitle>
          <CardDescription>
            {isLogin 
              ? 'Melde dich mit deinem Benutzernamen an' 
              : 'Erstelle einen kostenlosen Account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-4">
            {isLogin ? (
              <>
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
              </>
            ) : (
              <>
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
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Passwort"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Mindestens 6 Zeichen
                  </p>
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Passwort bestätigen"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Lädt...' : (isLogin ? 'Anmelden' : 'Registrieren')}
            </Button>
          </form>
          
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">
              {isLogin ? 'Noch kein Account?' : 'Bereits registriert?'}
            </span>
            {' '}
            <button
              onClick={toggleMode}
              className="text-primary hover:underline font-medium"
              disabled={loading}
            >
              {isLogin ? 'Jetzt registrieren' : 'Jetzt anmelden'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
