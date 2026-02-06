import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Zap, Search } from 'lucide-react';
import { AgentPreviewCard } from './AgentPreviewCard';
import { AgentState, Sector } from '@/types/tender';
import { LiveBrowserModal } from './LiveBrowserModal';

interface AgentPreviewGridProps {
  agents: AgentState[];
  sector: Sector;
}

export function AgentPreviewGrid({ agents, sector }: AgentPreviewGridProps) {
  const [expandedPreview, setExpandedPreview] = useState<{ url: string; name: string } | null>(null);
  
  const completedCount = agents.filter(a => a.status === 'complete').length;
  const searchingCount = agents.filter(a => a.status === 'searching').length;
  const connectingCount = agents.filter(a => a.status === 'connecting').length;
  const activeCount = searchingCount + connectingCount;

  // Show active agents first, then pending, then completed
  const sortedAgents = [...agents].sort((a, b) => {
    const priority: Record<string, number> = {
      'searching': 0,
      'connecting': 1,
      'pending': 2,
      'complete': 3,
      'error': 4,
    };
    return (priority[a.status] || 5) - (priority[b.status] || 5);
  });

  const handleExpandPreview = (url: string, name: string) => {
    setExpandedPreview({ url, name });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-7xl mx-auto px-4 mb-8"
    >
      {/* Header Section */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="inline-flex items-center gap-3 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 px-6 py-3 rounded-full mb-4"
        >
          <div className="relative">
            <Bot className="w-6 h-6 text-primary" />
            <Zap className="w-3 h-3 text-primary absolute -top-1 -right-1 animate-pulse" />
          </div>
          <span className="text-lg font-bold text-primary">AI Web Agents Active</span>
        </motion.div>
        
        <h3 className="text-2xl font-bold text-foreground mb-2">
          Searching for <span className="text-primary">{sector}</span> Tenders
        </h3>
        
        <div className="flex items-center justify-center gap-3 text-sm flex-wrap">
          {activeCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
              </span>
              <Search className="w-4 h-4" />
              {activeCount} agent{activeCount > 1 ? 's' : ''} browsing live
            </motion.div>
          )}
          {completedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 bg-success/20 text-success px-4 py-2 rounded-full"
            >
              ✓ {completedCount} completed
            </motion.div>
          )}
        </div>
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {sortedAgents.map((agent, index) => (
            <motion.div
              key={agent.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <AgentPreviewCard 
                agent={agent} 
                onExpandPreview={handleExpandPreview}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Live Browser Modal */}
      <LiveBrowserModal
        isOpen={!!expandedPreview}
        streamingUrl={expandedPreview?.url || ''}
        platformName={expandedPreview?.name || ''}
        onClose={() => setExpandedPreview(null)}
      />
    </motion.div>
  );
}
