'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { OfferCalculationResult, FrameInput, LensInput, CustomerCategoryCode } from '@/types/offer-engine';
import { useToast } from './ToastContext';

interface CartItem {
  id: string;
  frame: FrameInput;
  lens: LensInput;
  offerResult: OfferCalculationResult | null;
  customerCategory?: CustomerCategoryCode | null;
  couponCode?: string | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'offerResult'>) => Promise<void>;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<CartItem>) => Promise<void>;
  calculateOffers: (itemId: string) => Promise<void>;
  totalSavings: number;
  totalPayable: number;
  organizationId: string | null;
  setOrganizationId: (id: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // Fetch organizationId on mount
  useEffect(() => {
    const token = localStorage.getItem('lenstrack_token');
    if (token) {
      fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data?.organizationId) {
            setOrganizationId(data.data.organizationId);
          }
        });
    }
  }, []);

  const calculateOffers = useCallback(async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item || !organizationId) return;

    try {
      const response = await fetch('/api/offers/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame: item.frame,
          lens: item.lens,
          customerCategory: item.customerCategory || null,
          couponCode: item.couponCode || null,
          organizationId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setItems(prev => prev.map(i => 
          i.id === itemId ? { ...i, offerResult: data.data } : i
        ));
      } else {
        showToast('error', data.error?.message || 'Failed to calculate offers');
      }
    } catch (error) {
      showToast('error', 'Unable to calculate offer. Try again.');
    }
  }, [items, organizationId, showToast]);

  const addItem = useCallback(async (item: Omit<CartItem, 'id' | 'offerResult'>) => {
    if (!organizationId) {
      showToast('error', 'Organization not loaded. Please refresh.');
      return;
    }

    const newItem: CartItem = {
      ...item,
      id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      offerResult: null,
    };

    setItems(prev => [...prev, newItem]);
    
    // Auto-calculate offers
    setTimeout(() => {
      calculateOffers(newItem.id);
    }, 100);
  }, [organizationId, showToast, calculateOffers]);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateItem = useCallback(async (id: string, updates: Partial<CartItem>) => {
    setItems(prev => prev.map(i => 
      i.id === id ? { ...i, ...updates, offerResult: null } : i
    ));
    
    // Recalculate offers after update
    setTimeout(() => {
      calculateOffers(id);
    }, 100);
  }, [calculateOffers]);

  const totalSavings = items.reduce((sum, item) => {
    if (!item.offerResult) return sum;
    const baseTotal = item.offerResult.baseTotal;
    const finalPayable = item.offerResult.finalPayable;
    return sum + (baseTotal - finalPayable);
  }, 0);

  const totalPayable = items.reduce((sum, item) => {
    return sum + (item.offerResult?.finalPayable || item.frame.mrp + item.lens.price);
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateItem,
        calculateOffers,
        totalSavings,
        totalPayable,
        organizationId,
        setOrganizationId,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

