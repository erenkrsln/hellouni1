import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Users, BookOpen, Calendar, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import HelloUniLogo from "@/assets/HelloUni_Logo.svg";

export const Hero = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate("/home");
    }
  }, [user, loading, navigate]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (adminPassword !== 'hellouni') {
      toast.error('Falsches Admin-Passwort');
      return;
    }

    setAdminLoading(true);

    try {
      // Lookup email by username 'admin'
      const { data: profile, error: lookupError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', 'admin')
        .maybeSingle();

      if (lookupError || !profile) {
        toast.error('Admin-Account nicht gefunden. Bitte erstelle zuerst einen Account mit Benutzername "admin".');
        setAdminLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: 'hellouni',
      });

      if (error) throw error;
      toast.success('Admin erfolgreich angemeldet!');
      navigate('/home');
    } catch (error: any) {
      toast.error('Admin-Login fehlgeschlagen');
    } finally {
      setAdminLoading(false);
      setAdminPassword('');
    }
  };

  return (
    <div className="min-h-screen gradient-hero">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={HelloUniLogo} alt="HelloUni" className="h-16 w-auto" />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="font-medium text-xs sm:text-sm px-2 sm:px-4"
              onClick={() => navigate("/auth")}
            >
              Anmelden
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Content */}
      <main className="container mx-auto px-4 pt-20 pb-24 md:pt-32 md:pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-2 bg-card rounded-full shadow-card">
            <span className="text-sm font-medium text-muted-foreground">
              ✨ Die moderne Plattform für Studierende
            </span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Willkommen bei{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              HelloUni
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Deine digitale Heimat im Studium. Vernetze dich mit Kommilitonen, 
            organisiere deinen Stundenplan und bleib immer auf dem Laufenden.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button 
              size="lg" 
              className="w-full sm:w-auto font-semibold shadow-warm text-base"
              onClick={() => navigate("/auth")}
            >
              Kostenlos starten
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-20">
            <div className="bg-card p-6 rounded-2xl shadow-card hover:shadow-warm transition-all duration-300 hover:-translate-y-1">
              <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Community</h3>
              <p className="text-muted-foreground text-sm">
                Vernetze dich mit Studierenden aus deinen Kursen
              </p>
            </div>

            <div className="bg-card p-6 rounded-2xl shadow-card hover:shadow-warm transition-all duration-300 hover:-translate-y-1">
              <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Ressourcen</h3>
              <p className="text-muted-foreground text-sm">
                Teile und finde Lernmaterialien für dein Studium
              </p>
            </div>

            <div className="bg-card p-6 rounded-2xl shadow-card hover:shadow-warm transition-all duration-300 hover:-translate-y-1">
              <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Organisation</h3>
              <p className="text-muted-foreground text-sm">
                Behalte den Überblick über Termine und Deadlines
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Admin Login */}
      <div className="fixed bottom-4 right-4">
        <form onSubmit={handleAdminLogin} className="bg-card p-4 rounded-lg shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Admin Login</span>
          </div>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Admin-Passwort"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              disabled={adminLoading}
              className="w-40"
            />
            <Button 
              type="submit" 
              size="sm"
              disabled={adminLoading}
            >
              {adminLoading ? '...' : 'Login'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
