import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Github, FileText, MessageSquare, Star, Calendar, Tag, ThumbsUp, CheckCircle } from 'lucide-react';
import { PLATFORM_INFO } from '@/lib/constants';
import type { ConceptData } from '@/types';

interface DetailPanelProps {
  data: ConceptData;
  onClose: () => void;
}

const platformIcons = {
  github: Github,
  devto: FileText,
  stackoverflow: MessageSquare,
};

export function DetailPanel({ data, onClose }: DetailPanelProps) {
  const PlatformIcon = platformIcons[data.platform];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative w-full max-w-lg h-full bg-background border-l border-border flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <PlatformIcon className="h-5 w-5 text-primary" />
                <span className="text-sm text-primary font-medium">
                  {PLATFORM_INFO[data.platform].name}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h2 className="text-xl font-bold mb-2">{data.projectName}</h2>

            <a
              href={data.projectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              View Project <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Alignment Explanation (Highlighted) */}
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <h3 className="text-sm font-semibold mb-2 text-primary">
                💡 How This Relates to Your Idea
              </h3>
              <p className="text-sm">{data.alignmentExplanation}</p>
            </div>

            {/* Summary */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Summary</h3>
              <p className="text-sm text-muted-foreground">{data.summary}</p>
            </div>

            {/* Tech Stack */}
            {data.techStack.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Tech Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {data.techStack.map((tech, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-sm bg-primary/10 text-primary border border-primary/20 rounded"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Features */}
            {data.features && data.features.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Key Features</h3>
                <ul className="space-y-2">
                  {data.features.map((feature, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tags */}
            {data.tags && data.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {data.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-muted text-muted-foreground border border-border rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-4 border-t border-border space-y-2">
              {data.stars && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="h-4 w-4" />
                  <span>{data.stars.toLocaleString()} stars</span>
                </div>
              )}
              {data.votes !== undefined && data.votes !== null && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ThumbsUp className="h-4 w-4" />
                  <span>{data.votes} votes</span>
                </div>
              )}
              {data.isAccepted && (
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span>Has accepted answer</span>
                </div>
              )}
              {data.lastUpdated && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Last updated: {data.lastUpdated}</span>
                </div>
              )}
              {data.sourceUrl && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <ExternalLink className="h-4 w-4 shrink-0 mt-0.5" />
                  <a
                    href={data.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors break-all"
                  >
                    {data.sourceUrl}
                  </a>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
