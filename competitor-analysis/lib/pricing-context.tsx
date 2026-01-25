"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type {
  PricingState,
  BaselinePricing,
  Competitor,
  ScrapingStatus,
  Analysis,
  DetailLevel,
  CellEdit,
  VerificationAction,
  PricingTier,
  CompetitorPricing,
  EditHistory
} from '@/types';

const initialState: PricingState = {
  baseline: null,
  competitors: [],
  scrapingResults: {},
  analysis: null,
  currentStep: 1,
  detailLevel: 'high', // Default to high for detailed data
  lastUpdated: null,
  isFirstLoad: true,
  editHistory: [],
};

type Action =
  | { type: 'SET_BASELINE'; payload: BaselinePricing }
  | { type: 'SET_COMPETITORS'; payload: Competitor[] }
  | { type: 'ADD_COMPETITOR'; payload: Competitor }
  | { type: 'REMOVE_COMPETITOR'; payload: string }
  | { type: 'UPDATE_COMPETITOR'; payload: { id: string; updates: Partial<Competitor> } }
  | { type: 'SET_SCRAPING_STATUS'; payload: { id: string; status: ScrapingStatus } }
  | { type: 'CLEAR_SCRAPING_RESULTS' }
  | { type: 'SET_ANALYSIS'; payload: Analysis }
  | { type: 'SET_STEP'; payload: 1 | 2 | 3 | 4 }
  | { type: 'SET_DETAIL_LEVEL'; payload: DetailLevel }
  | { type: 'RESET' }
  | { type: 'LOAD_STATE'; payload: PricingState }
  | { type: 'SET_FIRST_LOAD'; payload: boolean }
  // New editing actions
  | { type: 'EDIT_TIER_FIELD'; payload: CellEdit }
  | { type: 'VERIFY_TIER'; payload: VerificationAction }
  | { type: 'ADD_DATA_QUALITY_NOTE'; payload: { competitorId: string; note: string } }
  | { type: 'UPDATE_COMPETITOR_PRICING'; payload: { id: string; data: CompetitorPricing } };

// Migration function to convert old schema to new schema
function migrateOldSchema(oldState: PricingState): PricingState {
  if (!oldState.scrapingResults) return oldState;

  const migratedResults: Record<string, ScrapingStatus> = {};

  Object.keys(oldState.scrapingResults).forEach(competitorId => {
    const result = oldState.scrapingResults[competitorId];

    if (result?.data?.tiers) {
      // Check if already migrated (has new fields)
      const firstTier = result.data.tiers[0];
      const needsMigration = firstTier && !('monthlyPrice' in firstTier || 'whatsIncluded' in firstTier);

      if (needsMigration) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const migratedTiers: PricingTier[] = result.data.tiers.map((tier: any) => ({
          // New required fields with defaults/conversions
          name: tier.name || 'Unknown',
          monthlyPrice: tier.billingPeriod === 'month' || tier.period === 'month' ? tier.price : null,
          annualPrice: tier.billingPeriod === 'year' || tier.period === 'year' ? tier.price : null,
          annualPriceNote: tier.billingPeriod === 'year' ? `$${tier.price}/year` : undefined,
          currency: tier.currency || 'USD',
          whatsIncluded: tier.includedUnits || tier.features?.join(', ') || 'Not specified',
          concurrent: tier.limits || 'Not specified',
          overage: tier.overagePrice ? `$${tier.overagePrice} per unit` : 'Not specified',
          sourceNotes: '',
          verified: false,

          // Keep legacy fields
          price: tier.price,
          billingPeriod: tier.billingPeriod || tier.period,
          unit: tier.unit,
          limits: tier.limits,
          includedUnits: tier.includedUnits,
          overagePrice: tier.overagePrice,
          features: tier.features,
          isEnterprise: tier.isEnterprise,
          hasFreeTrial: tier.hasFreeTrial,
        }));

        const migratedData: CompetitorPricing = {
          company: result.data.company || 'Unknown',
          url: result.data.url || '',
          tiers: migratedTiers,
          verificationSource: 'Auto-migrated from previous version',
          overallVerified: false,
          scrapedAt: result.data.scrapedAt || new Date().toISOString(),
          // Preserve legacy fields
          pricingModel: result.data.pricingModel,
          primaryUnit: result.data.primaryUnit,
          unitDefinition: result.data.unitDefinition,
          additionalNotes: result.data.additionalNotes,
        };

        migratedResults[competitorId] = {
          ...result,
          data: migratedData,
        };
      } else {
        migratedResults[competitorId] = result;
      }
    } else {
      migratedResults[competitorId] = result;
    }
  });

  return {
    ...oldState,
    scrapingResults: migratedResults,
    isFirstLoad: oldState.isFirstLoad ?? true,
    editHistory: oldState.editHistory ?? [],
  };
}

function reducer(state: PricingState, action: Action): PricingState {
  switch (action.type) {
    case 'SET_BASELINE':
      return { ...state, baseline: action.payload, lastUpdated: Date.now() };
    case 'SET_COMPETITORS':
      return { ...state, competitors: action.payload, lastUpdated: Date.now() };
    case 'ADD_COMPETITOR':
      return { ...state, competitors: [...state.competitors, action.payload], lastUpdated: Date.now() };
    case 'REMOVE_COMPETITOR':
      return {
        ...state,
        competitors: state.competitors.filter(c => c.id !== action.payload),
        scrapingResults: Object.fromEntries(
          Object.entries(state.scrapingResults).filter(([id]) => id !== action.payload)
        ),
        lastUpdated: Date.now()
      };
    case 'UPDATE_COMPETITOR':
      return {
        ...state,
        competitors: state.competitors.map(c =>
          c.id === action.payload.id ? { ...c, ...action.payload.updates } : c
        ),
        lastUpdated: Date.now(),
      };
    case 'SET_SCRAPING_STATUS': {
      // Merge with existing status to preserve fields like streamingUrl
      const existingStatus = state.scrapingResults[action.payload.id] || {};
      const newStatus = {
        ...existingStatus,
        ...action.payload.status,
        // Preserve streamingUrl if not provided in new status
        streamingUrl: action.payload.status.streamingUrl || existingStatus.streamingUrl,
      };
      return {
        ...state,
        scrapingResults: { ...state.scrapingResults, [action.payload.id]: newStatus },
        lastUpdated: Date.now(),
      };
    }
    case 'CLEAR_SCRAPING_RESULTS':
      return {
        ...state,
        scrapingResults: {},
        analysis: null,
        lastUpdated: Date.now(),
      };
    case 'SET_ANALYSIS':
      return { ...state, analysis: action.payload, lastUpdated: Date.now() };
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'SET_DETAIL_LEVEL':
      return { ...state, detailLevel: action.payload, lastUpdated: Date.now() };
    case 'RESET':
      return { ...initialState, lastUpdated: Date.now() };
    case 'LOAD_STATE':
      return migrateOldSchema(action.payload);
    case 'SET_FIRST_LOAD':
      return { ...state, isFirstLoad: action.payload };

    // New editing action handlers
    case 'EDIT_TIER_FIELD': {
      const { competitorId, tierIndex, field, value } = action.payload;
      const result = state.scrapingResults[competitorId];

      if (!result?.data?.tiers || tierIndex >= result.data.tiers.length) {
        return state;
      }

      const oldValue = result.data.tiers[tierIndex][field];
      const newTiers = [...result.data.tiers];
      newTiers[tierIndex] = {
        ...newTiers[tierIndex],
        [field]: value,
        lastEditedAt: new Date().toISOString(),
        lastEditedBy: 'User',
      };

      const editEntry: EditHistory = {
        field: `${competitorId}.tier[${tierIndex}].${field}`,
        oldValue: oldValue as string | number | null,
        newValue: value as string | number | null,
        editedBy: 'User',
        editedAt: new Date().toISOString(),
      };

      return {
        ...state,
        scrapingResults: {
          ...state.scrapingResults,
          [competitorId]: {
            ...result,
            data: {
              ...result.data,
              tiers: newTiers,
              lastUpdatedAt: new Date().toISOString(),
            },
          },
        },
        editHistory: [...(state.editHistory || []), editEntry],
        lastUpdated: Date.now(),
      };
    }

    case 'VERIFY_TIER': {
      const { competitorId, tierIndex, verifiedBy, verifiedAt, notes } = action.payload;
      const result = state.scrapingResults[competitorId];

      if (!result?.data?.tiers || tierIndex >= result.data.tiers.length) {
        return state;
      }

      const newTiers = [...result.data.tiers];
      newTiers[tierIndex] = {
        ...newTiers[tierIndex],
        verified: true,
        verifiedBy,
        verifiedAt,
        sourceNotes: notes
          ? `${newTiers[tierIndex].sourceNotes}${newTiers[tierIndex].sourceNotes ? '. ' : ''}${notes}`
          : newTiers[tierIndex].sourceNotes,
      };

      // Check if all tiers are now verified
      const allVerified = newTiers.every(t => t.verified);

      return {
        ...state,
        scrapingResults: {
          ...state.scrapingResults,
          [competitorId]: {
            ...result,
            data: {
              ...result.data,
              tiers: newTiers,
              overallVerified: allVerified,
              lastUpdatedAt: new Date().toISOString(),
            },
          },
        },
        lastUpdated: Date.now(),
      };
    }

    case 'ADD_DATA_QUALITY_NOTE': {
      const { competitorId, note } = action.payload;
      const result = state.scrapingResults[competitorId];

      if (!result?.data) {
        return state;
      }

      return {
        ...state,
        scrapingResults: {
          ...state.scrapingResults,
          [competitorId]: {
            ...result,
            data: {
              ...result.data,
              dataQualityNotes: result.data.dataQualityNotes
                ? `${result.data.dataQualityNotes}. ${note}`
                : note,
              lastUpdatedAt: new Date().toISOString(),
            },
          },
        },
        lastUpdated: Date.now(),
      };
    }

    case 'UPDATE_COMPETITOR_PRICING': {
      const { id, data } = action.payload;
      const existingResult = state.scrapingResults[id];

      return {
        ...state,
        scrapingResults: {
          ...state.scrapingResults,
          [id]: {
            ...existingResult,
            status: 'complete',
            data,
            completedAt: Date.now(),
          },
        },
        lastUpdated: Date.now(),
      };
    }

    default:
      return state;
  }
}

interface PricingContextType {
  state: PricingState;
  dispatch: React.Dispatch<Action>;
  setBaseline: (baseline: BaselinePricing) => void;
  setCompetitors: (competitors: Competitor[]) => void;
  addCompetitor: (competitor: Competitor) => void;
  removeCompetitor: (id: string) => void;
  updateCompetitor: (id: string, updates: Partial<Competitor>) => void;
  setScrapingStatus: (id: string, status: ScrapingStatus) => void;
  clearScrapingResults: () => void;
  setAnalysis: (analysis: Analysis) => void;
  setStep: (step: 1 | 2 | 3 | 4) => void;
  setDetailLevel: (level: DetailLevel) => void;
  reset: () => void;
  setFirstLoad: (isFirst: boolean) => void;
  // New editing functions
  editTierField: (edit: CellEdit) => void;
  verifyTier: (action: VerificationAction) => void;
  addDataQualityNote: (competitorId: string, note: string) => void;
  updateCompetitorPricing: (id: string, data: CompetitorPricing) => void;
}

const PricingContext = createContext<PricingContextType | undefined>(undefined);

const STORAGE_KEY = 'pricing-intelligence-state';

export function PricingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          dispatch({ type: 'LOAD_STATE', payload: parsed });
        } catch (e) {
          console.error('Failed to load saved state:', e);
        }
      }
    }
  }, []);

  // Save state to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined' && state.lastUpdated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const value: PricingContextType = {
    state,
    dispatch,
    setBaseline: (baseline) => dispatch({ type: 'SET_BASELINE', payload: baseline }),
    setCompetitors: (competitors) => dispatch({ type: 'SET_COMPETITORS', payload: competitors }),
    addCompetitor: (competitor) => dispatch({ type: 'ADD_COMPETITOR', payload: competitor }),
    removeCompetitor: (id) => dispatch({ type: 'REMOVE_COMPETITOR', payload: id }),
    updateCompetitor: (id, updates) => dispatch({ type: 'UPDATE_COMPETITOR', payload: { id, updates } }),
    setScrapingStatus: (id, status) => dispatch({ type: 'SET_SCRAPING_STATUS', payload: { id, status } }),
    clearScrapingResults: () => dispatch({ type: 'CLEAR_SCRAPING_RESULTS' }),
    setAnalysis: (analysis) => dispatch({ type: 'SET_ANALYSIS', payload: analysis }),
    setStep: (step) => dispatch({ type: 'SET_STEP', payload: step }),
    setDetailLevel: (level) => dispatch({ type: 'SET_DETAIL_LEVEL', payload: level }),
    reset: () => dispatch({ type: 'RESET' }),
    setFirstLoad: (isFirst) => dispatch({ type: 'SET_FIRST_LOAD', payload: isFirst }),
    // New editing functions
    editTierField: (edit) => dispatch({ type: 'EDIT_TIER_FIELD', payload: edit }),
    verifyTier: (action) => dispatch({ type: 'VERIFY_TIER', payload: action }),
    addDataQualityNote: (competitorId, note) => dispatch({ type: 'ADD_DATA_QUALITY_NOTE', payload: { competitorId, note } }),
    updateCompetitorPricing: (id, data) => dispatch({ type: 'UPDATE_COMPETITOR_PRICING', payload: { id, data } }),
  };

  return (
    <PricingContext.Provider value={value}>
      {children}
    </PricingContext.Provider>
  );
}

export function usePricing() {
  const context = useContext(PricingContext);
  if (context === undefined) {
    throw new Error('usePricing must be used within a PricingProvider');
  }
  return context;
}
