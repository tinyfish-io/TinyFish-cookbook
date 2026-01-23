"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type Sportsbook = {
  id: string;
  name: string;
  url: string;
  isCustom?: boolean;
};

type SportsbookSelectorProps = {
  sportsbooks: Sportsbook[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onAddCustom: (name: string, url: string) => void;
  onRemoveCustom: (id: string) => void;
  disabled?: boolean;
};

export default function SportsbookSelector({
  sportsbooks,
  selectedIds,
  onToggle,
  onAddCustom,
  onRemoveCustom,
  disabled = false,
}: SportsbookSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleAddCustom = () => {
    if (customName.trim() && customUrl.trim()) {
      onAddCustom(customName.trim(), customUrl.trim());
      setCustomName("");
      setCustomUrl("");
    }
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span>Sportsbooks</span>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-white">
          {selectedCount}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-zinc-200 bg-white shadow-lg"
          >
            <div className="border-b border-zinc-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-900">Select Sportsbooks</h3>
            </div>

            <div className="max-h-64 overflow-y-auto p-2">
              {sportsbooks.map((sportsbook) => (
                <div
                  key={sportsbook.id}
                  className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-zinc-50"
                >
                  <label className="flex flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(sportsbook.id)}
                      onChange={() => onToggle(sportsbook.id)}
                      className="h-4 w-4 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-zinc-700">{sportsbook.name}</span>
                  </label>
                  {sportsbook.isCustom && (
                    <button
                      onClick={() => onRemoveCustom(sportsbook.id)}
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-500"
                      title="Remove custom sportsbook"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-100 p-3">
              <div className="mb-2 text-xs font-medium text-zinc-500">Add Custom</div>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Name (e.g., MyBookie)"
                  className="w-full rounded border border-zinc-200 px-2 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
                />
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="URL (e.g., https://mybookie.com)"
                  className="w-full rounded border border-zinc-200 px-2 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
                />
                <button
                  onClick={handleAddCustom}
                  disabled={!customName.trim() || !customUrl.trim()}
                  className="w-full rounded bg-zinc-800 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add Sportsbook
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
