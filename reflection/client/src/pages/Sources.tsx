// Auth removed - app is now fully public
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Power, PowerOff, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Sources() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSource, setNewSource] = useState({
    type: "rss" as "rss" | "blog" | "newsletter" | "news" | "linkedin" | "x" | "podcast",
    name: "",
    url: "",
  });

  // Fetch sources
  const { data: sources, isLoading, refetch } = trpc.sources.list.useQuery();

  // Mutations
  const createMutation = trpc.sources.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsAddDialogOpen(false);
      setNewSource({ type: "rss", name: "", url: "" });
      toast.success("Source added successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add source");
    },
  });

  const updateMutation = trpc.sources.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Source updated");
    },
  });

  const deleteMutation = trpc.sources.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Source deleted");
    },
  });

  const handleAddSource = () => {
    if (!newSource.name || !newSource.url) {
      toast.error("Please fill in all fields");
      return;
    }
    createMutation.mutate(newSource);
  };

  const handleToggleSource = (id: number, enabled: number) => {
    updateMutation.mutate({ id, enabled: enabled ? 0 : 1 });
  };

  const handleDeleteSource = (id: number) => {
    if (confirm("Are you sure you want to delete this source?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Content Sources</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your RSS feeds, blogs, LinkedIn, X, podcasts, newsletters, and news sites
                </p>
              </div>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Source
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Source</DialogTitle>
                  <DialogDescription>
                    Add a new content source to your feed
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Source Type</Label>
                    <Select
                      value={newSource.type}
                      onValueChange={(value) =>
                        setNewSource({ ...newSource, type: value as any })
                      }
                    >
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rss">RSS Feed</SelectItem>
                        <SelectItem value="blog">Blog</SelectItem>
                        <SelectItem value="newsletter">Newsletter</SelectItem>
                        <SelectItem value="news">News Site</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="x">X (Twitter)</SelectItem>
                        <SelectItem value="podcast">Podcast</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., TechCrunch"
                      value={newSource.name}
                      onChange={(e) =>
                        setNewSource({ ...newSource, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">URL</Label>
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://..."
                      value={newSource.url}
                      onChange={(e) =>
                        setNewSource({ ...newSource, url: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddSource}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Adding..." : "Add Source"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Sources List */}
      <div className="container py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : sources && sources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sources.map((source) => (
              <Card key={source.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs uppercase">
                        {source.type}
                      </Badge>
                      {source.enabled ? (
                        <Badge variant="default" className="text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Paused
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg mb-1 truncate">
                      {source.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {source.url}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleToggleSource(source.id, source.enabled)}
                  >
                    {source.enabled ? (
                      <>
                        <PowerOff className="h-4 w-4 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Power className="h-4 w-4 mr-2" />
                        Resume
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteSource(source.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {source.lastFetched && (
                  <p className="text-xs text-muted-foreground mt-4">
                    Last updated:{" "}
                    {new Date(source.lastFetched).toLocaleDateString()}
                  </p>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-semibold mb-4">No sources yet</h2>
              <p className="text-muted-foreground mb-6">
                Add your first content source to start building your personalized feed
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Add Your First Source
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
