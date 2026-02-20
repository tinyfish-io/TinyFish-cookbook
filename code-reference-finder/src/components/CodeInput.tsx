'use client';

import { useState } from 'react';
import { Search, Clipboard } from 'lucide-react';

interface CodeInputProps {
  onSubmit: (code: string) => void;
  injectedCode?: string | null;
}

const EXAMPLES = [
  {
    label: 'React Query + Axios',
    code: `import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const { data, isLoading } = useQuery(['users'], () =>
  axios.get('/api/users').then(res => res.data)
);`,
  },
  {
    label: 'Express Middleware',
    code: `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());`,
  },
  {
    label: 'Prisma + Next.js',
    code: `import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET() {
  const users = await prisma.user.findMany({
    include: { posts: true },
  });
  return NextResponse.json(users);
}`,
  },
];

export function CodeInput({ onSubmit, injectedCode }: CodeInputProps) {
  const [code, setCode] = useState(injectedCode ?? '');

  const handleSubmit = () => {
    if (code.trim().length > 10) {
      onSubmit(code.trim());
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setCode(text);
    } catch {
      // Clipboard not available
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">
          Paste Unfamiliar Code
        </h2>
        <p className="text-zinc-400">
          We&apos;ll find real-world examples from GitHub repos and Stack
          Overflow posts that use the same libraries and APIs.
        </p>
      </div>

      <div className="relative">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your code snippet here..."
          className="w-full h-56 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 font-mono text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-600"
          spellCheck={false}
        />
        <button
          onClick={handlePaste}
          className="absolute top-3 right-3 p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
          title="Paste from clipboard"
        >
          <Clipboard className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-zinc-500">
          {code.length} characters
          {code.trim().length > 0 && code.trim().length <= 10 && (
            <span className="text-amber-500 ml-2">
              Paste at least 10 characters
            </span>
          )}
        </span>
        <button
          onClick={handleSubmit}
          disabled={code.trim().length <= 10}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium rounded-lg transition-colors"
        >
          <Search className="w-4 h-4" />
          Find References
        </button>
      </div>

      <div className="mt-10">
        <p className="text-xs text-zinc-500 mb-3">
          Or try an example:
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              onClick={() => setCode(ex.code)}
              className="px-3 py-1.5 text-xs text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
