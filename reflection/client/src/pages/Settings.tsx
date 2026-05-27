// Auth removed - app is now fully public
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Settings() {
  const [digestTime, setDigestTime] = useState("08:00");
  const [viewMode, setViewMode] = useState<"inbox" | "magazine" | "cards">("inbox");
  const [enableDigest, setEnableDigest] = useState(true);

  // Fetch preferences
  const { data: preferences, isLoading } = trpc.preferences.get.useQuery();

  // Update mutation
  const updateMutation = trpc.preferences.update.useMutation({
    onSuccess: () => {
      toast.success("Settings saved successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  // Logout removed - app is public

  // Load preferences
  useEffect(() => {
    if (preferences) {
      setDigestTime(preferences.digestTime || "08:00");
      setViewMode(preferences.viewMode || "inbox");
      setEnableDigest(!!preferences.enableDigest);
    }
  }, [preferences]);

  const handleSave = () => {
    updateMutation.mutate({
      digestTime,
      viewMode,
      enableDigest: enableDigest ? 1 : 0,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage your preferences and account
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Settings Content */}
      <div className="container py-8 max-w-2xl">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Account Info */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Account</h2>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  This is a public app. No account needed!
                </p>
              </div>
            </Card>

            {/* Feed Preferences */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Feed Preferences</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="viewMode">Default View Mode</Label>
                  <Select value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                    <SelectTrigger id="viewMode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inbox">Inbox</SelectItem>
                      <SelectItem value="magazine">Magazine</SelectItem>
                      <SelectItem value="cards">Cards</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose your preferred layout for viewing content
                  </p>
                </div>
              </div>
            </Card>

            {/* Digest Settings */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Daily Digest</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableDigest">Enable Daily Digest</Label>
                    <p className="text-xs text-muted-foreground">
                      Receive a daily summary of your unread content
                    </p>
                  </div>
                  <Switch
                    id="enableDigest"
                    checked={enableDigest}
                    onCheckedChange={setEnableDigest}
                  />
                </div>
                {enableDigest && (
                  <div className="space-y-2">
                    <Label htmlFor="digestTime">Delivery Time</Label>
                    <Input
                      id="digestTime"
                      type="time"
                      value={digestTime}
                      onChange={(e) => setDigestTime(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Time when you'll receive your daily digest
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                size="lg"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
