"use client";

import { useState, useEffect } from "react";
import { X, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePricing } from "@/lib/pricing-context";
import type { BaselinePricing } from "@/types";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  baseline: BaselinePricing | null;
  onSave: (baseline: BaselinePricing) => void;
}

export function SettingsPanel({ open, onClose, baseline, onSave }: SettingsPanelProps) {
  const { reset } = usePricing();
  const [formData, setFormData] = useState<Partial<BaselinePricing>>({
    companyName: "",
    pricingModel: undefined,
    unitType: "",
    pricePerUnit: 0,
    currency: "USD",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Sync with existing baseline when it changes
  useEffect(() => {
    if (baseline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(baseline);
    }
  }, [baseline]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.companyName?.trim()) {
      newErrors.companyName = "Company name is required";
    }
    if (!formData.pricingModel) {
      newErrors.pricingModel = "Select a pricing model";
    }
    if (!formData.unitType?.trim()) {
      newErrors.unitType = "Unit type is required";
    }
    if (!formData.pricePerUnit || formData.pricePerUnit <= 0) {
      newErrors.pricePerUnit = "Enter a valid price";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData as BaselinePricing);
    }
  };

  const handleCancel = () => {
    // Reset to original baseline
    if (baseline) {
      setFormData(baseline);
    } else {
      setFormData({
        companyName: "",
        pricingModel: undefined,
        unitType: "",
        pricePerUnit: 0,
        currency: "USD",
      });
    }
    setErrors({});
    onClose();
  };

  const handleClearData = () => {
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pricing-intelligence-state');
      // Also clear any other potential storage
      sessionStorage.clear();
    }
    // Reset the state
    reset();
    // Close dialogs and panel
    setShowClearDialog(false);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={handleCancel}
      />

      {/* Slide-out Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#e0dfde] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#165762] flex items-center justify-center">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-[#1a1a1a]">Settings</h2>
              <p className="text-xs text-[#165762]/50">Configure your baseline pricing</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="w-8 h-8 p-0 hover:bg-[#F4F3F2]"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-wider text-[#165762]/50 font-medium">
              Your Company Baseline
            </p>

            {/* Company Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1a1a1a]">
                Company Name
              </label>
              <Input
                placeholder="e.g., TinyFish"
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
                className={`h-11 bg-[#F4F3F2]/50 border-[#e0dfde] focus:border-[#D76228] focus:ring-[#D76228]/20 ${
                  errors.companyName ? "border-red-400" : ""
                }`}
              />
              {errors.companyName && (
                <p className="text-xs text-red-500">{errors.companyName}</p>
              )}
            </div>

            {/* Pricing Model */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1a1a1a]">
                Pricing Model
              </label>
              <Select
                value={formData.pricingModel}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    pricingModel: value as BaselinePricing["pricingModel"],
                  })
                }
              >
                <SelectTrigger
                  className={`h-11 bg-[#F4F3F2]/50 border-[#e0dfde] focus:border-[#D76228] focus:ring-[#D76228]/20 ${
                    errors.pricingModel ? "border-red-400" : ""
                  }`}
                >
                  <SelectValue placeholder="Select pricing model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="usage-based">Usage-based</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="freemium">Freemium</SelectItem>
                </SelectContent>
              </Select>
              {errors.pricingModel && (
                <p className="text-xs text-red-500">{errors.pricingModel}</p>
              )}
            </div>

            {/* Unit Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1a1a1a]">
                Unit Type
              </label>
              <Input
                placeholder="e.g., per user/month, per API call, per GB"
                value={formData.unitType}
                onChange={(e) =>
                  setFormData({ ...formData, unitType: e.target.value })
                }
                className={`h-11 bg-[#F4F3F2]/50 border-[#e0dfde] focus:border-[#D76228] focus:ring-[#D76228]/20 ${
                  errors.unitType ? "border-red-400" : ""
                }`}
              />
              {errors.unitType && (
                <p className="text-xs text-red-500">{errors.unitType}</p>
              )}
            </div>

            {/* Price and Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#1a1a1a]">
                  Price Per Unit
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#165762]/40">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.pricePerUnit || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pricePerUnit: parseFloat(e.target.value) || 0,
                      })
                    }
                    className={`h-11 pl-8 bg-[#F4F3F2]/50 border-[#e0dfde] focus:border-[#D76228] focus:ring-[#D76228]/20 ${
                      errors.pricePerUnit ? "border-red-400" : ""
                    }`}
                  />
                </div>
                {errors.pricePerUnit && (
                  <p className="text-xs text-red-500">{errors.pricePerUnit}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#1a1a1a]">
                  Currency
                </label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    setFormData({ ...formData, currency: value })
                  }
                >
                  <SelectTrigger className="h-11 bg-[#F4F3F2]/50 border-[#e0dfde] focus:border-[#D76228] focus:ring-[#D76228]/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-[#165762]/5 rounded-xl border border-[#165762]/10">
            <p className="text-xs text-[#165762]/70 leading-relaxed">
              This baseline will be used to compare against competitors in the pricing table.
              You can update it anytime.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1 h-11 border-[#e0dfde] hover:border-[#165762]/30"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 bg-[#D76228] hover:bg-[#c55620] text-white"
            >
              Save Changes
            </Button>
          </div>

          {/* Clear Data Section */}
          <div className="pt-6 border-t border-[#e0dfde]">
            <p className="text-xs uppercase tracking-wider text-[#165762]/50 font-medium mb-4">
              Danger Zone
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowClearDialog(true)}
              className="w-full h-11 border-red-300 hover:border-red-400 hover:bg-red-50 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Data
            </Button>
            <p className="text-xs text-[#165762]/50 mt-2">
              This will permanently delete all competitors, pricing data, and baseline settings.
            </p>
          </div>
        </form>
      </div>

      {/* Clear Data Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium text-[#1a1a1a]">
              Clear All Data?
            </DialogTitle>
            <DialogDescription className="text-sm text-[#165762]/70">
              This action cannot be undone. This will permanently delete:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All competitor data</li>
                <li>All pricing information</li>
                <li>Your baseline settings</li>
                <li>All analysis results</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowClearDialog(false)}
              className="flex-1 h-11 border-[#e0dfde] hover:border-[#165762]/30"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleClearData}
              className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white"
            >
              Clear All Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
