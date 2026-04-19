"use client";

import { useState, useCallback } from "react";
import { LoanType, BankLoanInfo, LoanAnalysisResult } from "@/types/loan";

export function useLoanSearch() {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [banks, setBanks] = useState<BankLoanInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const analyzeBank = useCallback(async (bank: BankLoanInfo, loanType: LoanType) => {
    setBanks((prev) =>
      prev.map((b) =>
        b.id === bank.id
          ? { ...b, status: "running" as const, statusMessage: "Starting analysis..." }
          : b
      )
    );

    try {
      const response = await fetch("/api/analyze-loan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: bank.url, bankName: bank.bankName, loanType }),
      });

      if (!response.ok) throw new Error(`Analysis failed: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "STREAMING_URL") {
              setBanks((prev) =>
                prev.map((b) =>
                  b.id === bank.id ? { ...b, streamingUrl: data.streamingUrl } : b
                )
              );
            } else if (data.type === "STATUS") {
              setBanks((prev) =>
                prev.map((b) =>
                  b.id === bank.id ? { ...b, statusMessage: data.message } : b
                )
              );
            } else if (data.type === "COMPLETE") {
              const result = data.result as LoanAnalysisResult;
              setBanks((prev) =>
                prev.map((b) =>
                  b.id === bank.id
                    ? { ...b, status: "completed" as const, result, streamingUrl: undefined }
                    : b
                )
              );
            } else if (data.type === "ERROR") {
              throw new Error(data.message || "Analysis failed");
            }
          } catch {
            // ignore parse errors for partial chunks
          }
        }
      }
    } catch (err) {
      console.error("Analysis error for", bank.bankName, err);
      setBanks((prev) =>
        prev.map((b) =>
          b.id === bank.id ? { ...b, status: "error" as const } : b
        )
      );
    }
  }, []);

  const discoverBanks = useCallback(
    async (loanType: LoanType, location: string) => {
      setIsDiscovering(true);
      setError(null);
      setBanks([]);

      try {
        const res = await fetch("/api/discover-banks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ loanType, location }),
        });

        if (!res.ok) throw new Error("Failed to discover banks");

        const { banks: discovered } = await res.json();

        if (!discovered?.length) {
          setError("No banks found. Try a different location or loan type.");
          return;
        }

        const bankList: BankLoanInfo[] = discovered.map(
          (bank: { name: string; url: string }, index: number) => ({
            id: `bank-${index}`,
            bankName: bank.name,
            url: bank.url,
            status: "pending" as const,
          })
        );

        setBanks(bankList);
        setIsDiscovering(false);

        // Run all agents in parallel — results stream in as each finishes
        await Promise.allSettled(
          bankList.map((bank) => analyzeBank(bank, loanType))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Discovery failed");
      } finally {
        setIsDiscovering(false);
      }
    },
    [analyzeBank]
  );

  const reset = useCallback(() => {
    setBanks([]);
    setError(null);
    setIsDiscovering(false);
  }, []);

  return { isDiscovering, banks, error, discoverBanks, reset };
}
