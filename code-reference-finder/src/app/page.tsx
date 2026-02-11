'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { CodeInput } from '@/components/CodeInput';
import { Dashboard } from '@/components/Dashboard';
import { useCodeAnalysis } from '@/hooks/useCodeAnalysis';

export default function Home() {
  const { analyze, cancel, reset, state } = useCodeAnalysis();
  const [injectedCode, setInjectedCode] = useState<string | null>(null);

  // Listen for postMessage from Chrome extension iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'INJECT_CODE' && event.data.code) {
        setInjectedCode(event.data.code);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const isInputPhase = state.phase === 'input';

  return (
    <div className="flex flex-col h-screen">
      <Header showReset={!isInputPhase} onReset={reset} />
      {isInputPhase ? (
        <CodeInput
          onSubmit={analyze}
          injectedCode={injectedCode}
        />
      ) : (
        <Dashboard state={state} onCancel={cancel} />
      )}
    </div>
  );
}
