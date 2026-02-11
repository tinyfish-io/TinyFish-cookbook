'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Github,
  MessageCircle,
  Star,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  Tag,
} from 'lucide-react';
import type { ReferenceData } from '@/lib/types';

interface ReferenceCardProps {
  data: ReferenceData;
}

export function ReferenceCard({ data }: ReferenceCardProps) {
  const [showSnippets, setShowSnippets] = useState(false);
  const isGitHub = data.platform === 'github';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {isGitHub ? (
            <Github className="w-4 h-4 text-zinc-400 shrink-0" />
          ) : (
            <MessageCircle className="w-4 h-4 text-orange-400 shrink-0" />
          )}
          <a
            href={data.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-blue-400 hover:text-blue-300 truncate flex items-center gap-1"
          >
            {data.title}
            <ArrowUpRight className="w-3 h-3 shrink-0" />
          </a>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-3 mb-2">
        {isGitHub && data.stars != null && (
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <Star className="w-3 h-3" />
            {data.stars.toLocaleString()}
          </span>
        )}
        {isGitHub && data.repoLanguage && (
          <span className="text-xs text-zinc-500">{data.repoLanguage}</span>
        )}
        {!isGitHub && data.votes != null && (
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <ThumbsUp className="w-3 h-3" />
            {data.votes}
          </span>
        )}
        {data.tags && data.tags.length > 0 && (
          <div className="flex items-center gap-1">
            <Tag className="w-3 h-3 text-zinc-600" />
            {data.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Alignment explanation */}
      <p className="text-xs text-zinc-400 leading-relaxed mb-2">
        {data.alignmentExplanation}
      </p>

      {/* Description or excerpt */}
      {isGitHub && data.repoDescription && (
        <p className="text-xs text-zinc-500 italic mb-2">
          {data.repoDescription}
        </p>
      )}

      {/* Code snippets toggle */}
      {data.codeSnippets && data.codeSnippets.length > 0 && (
        <>
          <button
            onClick={() => setShowSnippets(!showSnippets)}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showSnippets ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            {data.codeSnippets.length} code snippet
            {data.codeSnippets.length > 1 ? 's' : ''}
          </button>

          {showSnippets && (
            <div className="mt-2 space-y-2">
              {data.codeSnippets.map((snippet, i) => (
                <div key={i}>
                  {snippet.context && (
                    <p className="text-[10px] text-zinc-600 mb-1">
                      {snippet.context}
                    </p>
                  )}
                  <pre className="text-xs text-zinc-300 bg-zinc-950 rounded p-2 overflow-x-auto max-h-40">
                    <code>{snippet.code}</code>
                  </pre>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
