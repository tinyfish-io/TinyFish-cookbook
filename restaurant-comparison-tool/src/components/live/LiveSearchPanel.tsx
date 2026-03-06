import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RestaurantAgentCard } from './RestaurantAgentCard';
import { LiveBrowserPreview } from './LiveBrowserPreview';
import type { RestaurantAgentState } from '@/types';
import { AnimatePresence } from 'framer-motion';

interface LiveSearchPanelProps {
  agents: Record<string, RestaurantAgentState>;
  city: string;
  onCancel: () => void;
}

export function LiveSearchPanel({ agents, city, onCancel }: LiveSearchPanelProps) {
  const [expandedPreview, setExpandedPreview] = useState<{ url: string; name: string } | null>(null);

  const agentList = Object.values(agents);
  const completedCount = agentList.filter(a => a.status === 'complete' || a.status === 'error').length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-5xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Analyzing restaurants in "{city}"
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {completedCount}/{agentList.length} restaurants analyzed
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>

      <div className="w-full bg-muted rounded-full h-2 mb-6">
        <motion.div
          className="bg-primary h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(completedCount / agentList.length) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agentList.map((agent) => (
          <RestaurantAgentCard
            key={agent.id}
            agent={agent}
            onExpandPreview={(url, name) => setExpandedPreview({ url, name })}
          />
        ))}
      </div>

      <AnimatePresence>
        {expandedPreview && (
          <LiveBrowserPreview
            streamingUrl={expandedPreview.url}
            restaurantName={expandedPreview.name}
            onClose={() => setExpandedPreview(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
