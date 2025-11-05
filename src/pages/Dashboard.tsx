import { UserButton, useUser } from "@clerk/clerk-react";
import { Calendar, BookOpen, Users, Bell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Dashboard = () => {
  const { user } = useUser();

  return (
    <div className="min-h-screen gradient-hero">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-xl font-bold text-primary-foreground">HU</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                HelloUni
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Bell className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
              <UserButton afterSignOutUrl="/" />
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Hallo, {user?.firstName || 'Studierende/r'}! 👋
          </h1>
          <p className="text-muted-foreground">
            Willkommen zurück auf deiner Studierendenplattform
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-card hover:shadow-warm transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Nächste Vorlesung</CardTitle>
                <Calendar className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold mb-1">Mathematik II</p>
              <p className="text-sm text-muted-foreground">Morgen um 10:00 Uhr</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-warm transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Kurse</CardTitle>
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold mb-1">5 Aktive Kurse</p>
              <p className="text-sm text-muted-foreground">Dieses Semester</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-warm transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Lerngruppen</CardTitle>
                <Users className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold mb-1">3 Gruppen</p>
              <p className="text-sm text-muted-foreground">+ 12 Mitglieder</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Aktuelle Aktivitäten</CardTitle>
            <CardDescription>
              Hier findest du bald deine neuesten Updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">Neues Lernmaterial verfügbar</p>
                  <p className="text-sm text-muted-foreground">
                    Skript für Mathematik II wurde hochgeladen
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">vor 2h</span>
              </div>

              <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">Neue Nachricht in Lerngruppe</p>
                  <p className="text-sm text-muted-foreground">
                    Anna hat einen Termin für das nächste Treffen vorgeschlagen
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">vor 5h</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
