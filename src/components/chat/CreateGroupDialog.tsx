import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useEdgeFunctionAuth } from "@/lib/edgeFunctions";

interface User {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onGroupCreated: () => void;
}

export const CreateGroupDialog = ({
  open,
  onOpenChange,
  currentUserId,
  onGroupCreated,
}: CreateGroupDialogProps) => {
  const { toast } = useToast();
  const { callEdgeFunction } = useEdgeFunctionAuth();
  const [groupName, setGroupName] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .neq("id", currentUserId)
        .order("full_name");

      if (error) throw error;
      setUsers(data || []);
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

  const handleUserToggle = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte gib einen Gruppennamen ein",
        variant: "destructive",
      });
      return;
    }

    if (selectedUsers.size < 2) {
      toast({
        title: "Fehler",
        description: "Wähle mindestens 2 Teilnehmer aus",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      await callEdgeFunction('conversations', {
        action: 'CREATE_GROUP',
        groupName: groupName.trim(),
        participantIds: Array.from(selectedUsers),
      });

      toast({
        title: "Erfolg",
        description: "Gruppe wurde erstellt",
      });

      setGroupName("");
      setSelectedUsers(new Set());
      onOpenChange(false);
      onGroupCreated();
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Neue Gruppe erstellen</DialogTitle>
          <DialogDescription>
            Erstelle eine Gruppe mit mehreren Teilnehmern
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Gruppenname</Label>
            <Input
              id="groupName"
              placeholder="z.B. Studiengruppe BWL"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Teilnehmer auswählen (min. 2)</Label>
            <ScrollArea className="h-[300px] border rounded-md p-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={user.id}
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={() => handleUserToggle(user.id)}
                      />
                      <label
                        htmlFor={user.id}
                        className="flex-1 text-sm cursor-pointer"
                      >
                        <div className="font-medium">
                          {user.full_name || "Unbekannter Nutzer"}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {user.email}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <p className="text-sm text-muted-foreground">
              {selectedUsers.size} Teilnehmer ausgewählt
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              Abbrechen
            </Button>
            <Button onClick={handleCreateGroup} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Erstelle...
                </>
              ) : (
                "Gruppe erstellen"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
