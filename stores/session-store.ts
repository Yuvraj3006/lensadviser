/**
 * Session Store - Global state for language, store, sales mode, staff
 * Integrated with existing flow
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Staff {
  id: string;
  name: string;
  phone?: string;
  role: 'STORE_MANAGER' | 'NC' | 'JR' | 'OPTOMETRIST' | 'SALES';
  status: 'ACTIVE' | 'INACTIVE';
}

interface SessionState {
  // Language
  language: 'en' | 'hi' | 'hinglish' | null;
  
  // Store context
  storeId: string | null;
  storeCode: string | null;
  storeName: string | null;
  
  // Sales mode
  salesMode: 'SELF_SERVICE' | 'STAFF_ASSISTED' | null;
  
  // Staff context
  staffId: string | null;
  staffList: Staff[];
  
  // Actions
  setLanguage: (lang: 'en' | 'hi' | 'hinglish') => void;
  setStore: (storeId: string, storeCode: string, storeName: string) => void;
  setSalesMode: (mode: 'SELF_SERVICE' | 'STAFF_ASSISTED') => void;
  setStaffId: (id: string | null) => void;
  setStaffList: (list: Staff[]) => void;
  reset: () => void;
}

const initialState = {
  language: null as 'en' | 'hi' | 'hinglish' | null,
  storeId: null as string | null,
  storeCode: null as string | null,
  storeName: null as string | null,
  salesMode: null as 'SELF_SERVICE' | 'STAFF_ASSISTED' | null,
  staffId: null as string | null,
  staffList: [] as Staff[],
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setLanguage: (lang) => set({ language: lang }),
      
      setStore: (storeId, storeCode, storeName) =>
        set({ storeId, storeCode, storeName }),
      
      setSalesMode: (mode) => set({ salesMode: mode }),
      
      setStaffId: (id) => set({ staffId: id }),
      
      setStaffList: (list) => set({ staffList: list }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'lenstrack-session',
      partialize: (state) => ({
        language: state.language,
        storeId: state.storeId,
        storeCode: state.storeCode,
        storeName: state.storeName,
        salesMode: state.salesMode,
        staffId: state.staffId,
      }),
    }
  )
);

