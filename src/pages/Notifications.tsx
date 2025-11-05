import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Bell } from "lucide-react";

const Notifications = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container max-w-4xl mx-auto px-4 py-6">
        <Card className="p-12 text-center">
          <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Benachrichtigungen</h2>
          <p className="text-muted-foreground">
            Keine neuen Benachrichtigungen
          </p>
        </Card>
      </main>
    </div>
  );
};

export default Notifications;
