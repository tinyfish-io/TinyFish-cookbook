import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LoanType, BankLoanInfo, LoanAnalysisResult } from '@/types/loan';
import { toast } from '@/hooks/use-toast';

export function useLoanSearch() {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [banks, setBanks] = useState<BankLoanInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const discoverBanks = useCallback(async (loanType: LoanType, location: string) => {
    setIsDiscovering(true);
    setError(null);
    setBanks([]);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('discover-banks', {
        body: { loanType, location }
      });

      if (fnError) throw fnError;

      if (!data?.banks || !Array.isArray(data.banks)) {
        throw new Error('Invalid response from bank discovery');
      }

      const bankList: BankLoanInfo[] = data.banks.map((bank: { name: string; url: string }, index: number) => ({
        id: `bank-${index}`,
        bankName: bank.name,
        url: bank.url,
        status: 'pending' as const
      }));

      setBanks(bankList);
      setIsDiscovering(false);

      // Start analyzing each bank
      for (const bank of bankList) {
        analyzeBank(bank, loanType);
      }
    } catch (err) {
      console.error('Discovery error:', err);
      setError(err instanceof Error ? err.message : 'Failed to discover banks');
      setIsDiscovering(false);
      toast({
        title: 'Discovery Failed',
        description: 'Could not find bank loan pages. Please try again.',
        variant: 'destructive'
      });
    }
  }, []);

  const analyzeBank = useCallback(async (bank: BankLoanInfo, loanType: LoanType) => {
    // Update status to running
    setBanks(prev => prev.map(b => 
      b.id === bank.id ? { ...b, status: 'running' as const, statusMessage: 'Starting analysis...' } : b
    ));

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-loan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({ url: bank.url, bankName: bank.bankName, loanType })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;

            try {
              const data = JSON.parse(jsonStr);

              if (data.streamingUrl) {
                setBanks(prev => prev.map(b =>
                  b.id === bank.id ? { ...b, streamingUrl: data.streamingUrl } : b
                ));
              }

              if (data.type === 'STATUS') {
                setBanks(prev => prev.map(b =>
                  b.id === bank.id ? { ...b, statusMessage: data.message } : b
                ));
              }

              if (data.type === 'COMPLETE' && data.result) {
                const result: LoanAnalysisResult = data.result;
                setBanks(prev => prev.map(b =>
                  b.id === bank.id ? { ...b, status: 'completed' as const, result, streamingUrl: undefined } : b
                ));
              }

              if (data.type === 'ERROR') {
                throw new Error(data.message || 'Analysis failed');
              }
            } catch (parseError) {
              // Ignore parse errors for partial data
            }
          }
        }
      }
    } catch (err) {
      console.error('Analysis error for', bank.bankName, err);
      setBanks(prev => prev.map(b =>
        b.id === bank.id ? { ...b, status: 'error' as const } : b
      ));
    }
  }, []);

  const reset = useCallback(() => {
    setBanks([]);
    setError(null);
    setIsDiscovering(false);
  }, []);

  return {
    isDiscovering,
    banks,
    error,
    discoverBanks,
    reset
  };
}
