import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, Activity, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import AppLayout from "@/components/layout/AppLayout";
import { fetchExecutions, fetchActions, DbExecution } from "@/lib/api";

export default function SettingsPage() {
  const [stats, setStats] = useState({ total: 0, successRate: "0%", avgDuration: "0s", actionCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [execs, actions] = await Promise.all([fetchExecutions(), fetchActions()]);
        const completed = execs.filter((e) => e.status !== "running");
        const successes = completed.filter((e) => e.status === "success");
        const avgMs = completed.reduce((sum, e) => sum + (e.duration || 0), 0) / (completed.length || 1);

        setStats({
          total: execs.length,
          successRate: completed.length > 0 ? ((successes.length / completed.length) * 100).toFixed(1) + "%" : "N/A",
          avgDuration: (avgMs / 1000).toFixed(1) + "s",
          actionCount: actions.length,
        });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your Synapse usage.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Usage Stats
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Saved Actions", value: stats.actionCount.toString() },
                  { label: "Total Executions", value: stats.total.toString() },
                  { label: "Success Rate", value: stats.successRate },
                  { label: "Avg Duration", value: stats.avgDuration },
                ].map((stat) => (
                  <Card key={stat.label} className="bg-card border-border">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                How it works
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                <li>Create actions in the <strong>Playground</strong> with step-by-step instructions</li>
                <li>Click <strong>Save</strong> to persist them to your <strong>Library</strong></li>
                <li>Click <strong>Run Action</strong> to execute via TinyFish's browser automation API</li>
                <li>View results in real-time on the <strong>Monitor</strong> page</li>
              </ul>
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
