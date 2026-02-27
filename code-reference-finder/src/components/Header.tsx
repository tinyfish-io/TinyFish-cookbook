'use client';

import { Code2, RotateCcw } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

interface HeaderProps {
  showReset?: boolean;
  onReset?: () => void;
}

export function Header({ showReset, onReset }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
      <div className="flex items-center gap-3">
        <Code2 className="w-6 h-6 text-blue-400" />
        <h1 className="text-lg font-semibold text-zinc-100">{APP_NAME}</h1>
      </div>
      {showReset && onReset && (
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          New Search
        </button>
      )}
    </header>
  );
}
