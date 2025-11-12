import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { UserCircle } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/home');
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
        toast.error('Benutzername oder Passwort falsch');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: password,
      });

      if (error) {
        toast.error('Benutzername oder Passwort falsch');
      } else {
        toast.success('Erfolgreich angemeldet!');
        navigate('/home');
      }
    } catch (error: any) {
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !email || !password) {
      toast.error('Bitte fülle alle Felder aus');
      return;
    }

    if (password.length < 6) {
      toast.error('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    setLoading(true);

    try {
      // Check if username already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle();

      if (existingProfile) {
        toast.error('Benutzername ist bereits vergeben');
        setLoading(false);
        return;
      }

      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (signUpError) throw signUpError;

      // Create profile with username
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            username: username,
            email: email,
          });

        if (profileError) throw profileError;

        toast.success('Account erfolgreich erstellt!');
        navigate('/home');
      }
    } catch (error: any) {
      if (error.message.includes('already registered')) {
        toast.error('Diese E-Mail ist bereits registriert');
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
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <UserCircle className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {isLogin ? 'Willkommen zurück' : 'Account erstellen'}
          </CardTitle>
          <CardDescription>
            {isLogin 
              ? 'Melde dich mit deinem Benutzernamen an' 
              : 'Erstelle deinen HelloUni Account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-4">
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
            {!isLogin && (
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
                type="password"
                placeholder="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading 
                ? 'Lädt...' 
                : isLogin ? 'Anmelden' : 'Registrieren'}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => {
                setIsLogin(!isLogin);
                setUsername('');
                setEmail('');
                setPassword('');
              }}
              disabled={loading}
            >
              {isLogin 
                ? 'Noch kein Account? Registrieren' 
                : 'Bereits Account? Anmelden'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
