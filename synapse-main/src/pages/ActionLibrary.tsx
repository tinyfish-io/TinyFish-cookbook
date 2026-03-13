import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Globe, ChevronRight, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { fetchActions, deleteAction, DbAction } from "@/lib/api";
import { toast } from "sonner";

export default function ActionLibrary() {
  const [search, setSearch] = useState("");
  const [actions, setActions] = useState<DbAction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActions = async () => {
    try {
      const data = await fetchActions();
      setActions(data);
    } catch {
      toast.error("Failed to load actions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActions();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteAction(id);
      setActions((prev) => prev.filter((a) => a.id !== id));
      toast.success("Action deleted");
    } catch {
      toast.error("Failed to delete action");
    }
  };

  const filtered = actions.filter((a) => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.target_site?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Action Library</h1>
          <p className="text-sm text-muted-foreground">Your saved action definitions — click to edit in the Playground.</p>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search actions..." className="pl-9 bg-secondary border-none h-9" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            {search ? "No actions match your search." : "No actions saved yet. Create one in the Playground."}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((action, i) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/playground?id=${action.id}`} className="block group">
                  <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30 hover:bg-card/80">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-sm">{action.name}</h3>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => handleDelete(action.id, e)}>
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                    {action.description && (
                      <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{action.description}</p>
                    )}
                    {action.target_site && (
                      <div className="flex items-center gap-2 mb-3">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-mono text-muted-foreground">{action.target_site}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        {action.tags?.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] h-5">{tag}</Badge>
                        ))}
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">{action.steps.length} steps</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
