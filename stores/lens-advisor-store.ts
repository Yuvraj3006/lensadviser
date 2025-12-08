/**
 * Lens Advisor Zustand Store
 * Matches Frontend Specification exactly
 */

import { create } from 'zustand';
import { FrameInput, OfferCalculationResult } from '@/types/offer-engine';

// Rx Input interface
export interface RxInput {
  // Right Eye (OD)
  odSphere?: number | null;
  odCylinder?: number | null;
  odAxis?: number | null;
  odAdd?: number | null;
  
  // Left Eye (OS)
  osSphere?: number | null;
  osCylinder?: number | null;
  osAxis?: number | null;
  osAdd?: number | null;
  
  // Vision type suggestion (auto but user can override)
  visionType?: 'SINGLE_VISION' | 'BIFOCAL' | 'PROGRESSIVE' | null;
}

// Answer Selection
export interface AnswerSelection {
  questionId: string;
  optionId: string;
  optionKey: string;
}

// Selected Lens
export interface SelectedLens {
  id: string;
  itCode: string;
  name: string;
  brandLine: string;
  price: number;
  yopoEligible: boolean;
}

// Lens Advisor State (matches spec exactly)
interface LensAdvisorState {
  currentStep: 1 | 2 | 3 | 4 | 5 | 6;
  rx: RxInput;
  frame: FrameInput | null;
  answers: AnswerSelection[];
  recommendations: any[];
  selectedLens: SelectedLens | null;
  offerResult: OfferCalculationResult | null;
  customerCategory?: string | null;
  couponCode?: string | null;
  
  // Actions
  setRx: (rx: RxInput) => void;
  setFrame: (frame: FrameInput) => void;
  addAnswer: (answer: AnswerSelection) => void;
  removeAnswer: (questionId: string) => void;
  setRecommendations: (recommendations: any[]) => void;
  setSelectedLens: (lens: SelectedLens | null) => void;
  setOfferResult: (result: OfferCalculationResult | null) => void;
  setCurrentStep: (step: 1 | 2 | 3 | 4 | 5 | 6) => void;
  setCustomerCategory: (category: string | null) => void;
  setCouponCode: (code: string | null) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 1 as const,
  rx: {} as RxInput,
  frame: null as FrameInput | null,
  answers: [] as AnswerSelection[],
  recommendations: [] as any[],
  selectedLens: null as SelectedLens | null,
  offerResult: null as OfferCalculationResult | null,
  customerCategory: null as string | null,
  couponCode: null as string | null,
};

export const useLensAdvisorStore = create<LensAdvisorState>((set) => ({
  ...initialState,
  
  setRx: (rx) => set({ rx }),
  
  setFrame: (frame) => set({ frame }),
  
  addAnswer: (answer) =>
    set((state) => ({
      answers: [...state.answers.filter((a) => a.questionId !== answer.questionId), answer],
    })),
  
  removeAnswer: (questionId) =>
    set((state) => ({
      answers: state.answers.filter((a) => a.questionId !== questionId),
    })),
  
  setRecommendations: (recommendations) => set({ recommendations }),
  
  setSelectedLens: (lens) => set({ selectedLens: lens }),
  
  setOfferResult: (result) => set({ offerResult: result }),
  
  setCurrentStep: (step) => set({ currentStep: step }),
  
  setCustomerCategory: (category) => set({ customerCategory: category }),
  
  setCouponCode: (code) => set({ couponCode: code }),
  
  reset: () => set(initialState),
}));

