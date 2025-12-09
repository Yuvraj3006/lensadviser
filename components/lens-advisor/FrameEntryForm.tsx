'use client';

/**
 * Step 2: Frame Entry Form
 * Dynamic form with backend frame brands and sub-brands
 */

import { useState, useEffect } from 'react';
import { useLensAdvisorStore } from '@/stores/lens-advisor-store';
import { useSessionStore } from '@/stores/session-store';
import { FrameInput } from '@/types/offer-engine';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Frame } from 'lucide-react';

interface FrameBrand {
  id: string;
  brandName: string;
  subBrands: {
    id: string;
    subBrandName: string;
  }[];
}

const frameTypes = [
  { value: 'FULL_RIM', label: 'Full Rim' },
  { value: 'HALF_RIM', label: 'Half Rim' },
  { value: 'RIMLESS', label: 'Rimless' },
];

interface FrameEntryFormProps {
  hideNextButton?: boolean;
}

const materials = [
  { value: 'METAL', label: 'Metal' },
  { value: 'TR90', label: 'TR90' },
  { value: 'ACETATE', label: 'Acetate' },
  { value: 'TITANIUM', label: 'Titanium' },
];

export function FrameEntryForm({ hideNextButton = false }: FrameEntryFormProps = {}) {
  const frame = useLensAdvisorStore((state) => state.frame);
  const setFrame = useLensAdvisorStore((state) => state.setFrame);
  const setCurrentStep = useLensAdvisorStore((state) => state.setCurrentStep);
  const storeName = useSessionStore((state) => state.storeName);
  const storeCode = useSessionStore((state) => state.storeCode);

  const [brands, setBrands] = useState<FrameBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [availableSubBrands, setAvailableSubBrands] = useState<{ id: string; subBrandName: string }[]>([]);

  const [formData, setFormData] = useState<Partial<FrameInput & { material?: string; modelName?: string; color?: string }>>({
    brand: frame?.brand || '',
    subCategory: frame?.subCategory || null,
    mrp: frame?.mrp || 0,
    frameType: frame?.frameType || undefined,
    material: '',
    modelName: '',
    color: '',
  });

  // Fetch frame brands from backend
  useEffect(() => {
    let isMounted = true;
    
    const fetchBrands = async () => {
      setLoading(true);
      try {
        // Get storeCode from session store or localStorage fallback
        const currentStoreCode = storeCode || localStorage.getItem('lenstrack_store_code') || 'MAIN-001';
        
        if (!currentStoreCode) {
          console.error('[FrameEntryForm] Store code not found in store or localStorage');
          if (isMounted) setLoading(false);
          return;
        }

        console.log('[FrameEntryForm] Fetching brands for storeCode:', currentStoreCode);
        const response = await fetch(`/api/public/frame-brands?storeCode=${currentStoreCode}`);
        
        if (!response.ok) {
          console.error('[FrameEntryForm] API response not OK:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('[FrameEntryForm] Error response:', errorText);
          if (isMounted) setLoading(false);
          return;
        }

        const data = await response.json();
        console.log('[FrameEntryForm] Brands API response:', data);

        if (!isMounted) return;

        if (data.success && data.data && Array.isArray(data.data)) {
          console.log('[FrameEntryForm] Loaded brands:', data.data.length);
          setBrands(data.data);
          // Brand selection will be handled by separate useEffect
        } else {
          console.error('[FrameEntryForm] Failed to load frame brands:', data.error || 'Unknown error', data);
        }
      } catch (error) {
        console.error('[FrameEntryForm] Error fetching frame brands:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Always try to fetch on mount and when storeCode changes
    fetchBrands();
    
    return () => {
      isMounted = false;
    };
  }, [storeCode]); // Only depend on storeCode, frame.brand will be checked inside

  // Initialize selected brand from frame if brands are loaded
  useEffect(() => {
    if (frame?.brand && brands.length > 0 && !selectedBrandId) {
      const existingBrand = brands.find((b: FrameBrand) => b.brandName === frame.brand);
      if (existingBrand) {
        setSelectedBrandId(existingBrand.id);
        setAvailableSubBrands(existingBrand.subBrands);
      }
    }
  }, [brands, frame?.brand, selectedBrandId]);

  // Update available sub-brands when brand changes
  useEffect(() => {
    if (selectedBrandId && brands.length > 0) {
      const selectedBrand = brands.find((b) => b.id === selectedBrandId);
      if (selectedBrand) {
        setAvailableSubBrands(selectedBrand.subBrands);
        setFormData((prev) => ({ 
          ...prev, 
          brand: selectedBrand.brandName, 
          subCategory: null 
        }));
      }
    } else if (!selectedBrandId) {
      setAvailableSubBrands([]);
      setFormData((prev) => ({ 
        ...prev, 
        brand: '', 
        subCategory: null 
      }));
    }
  }, [selectedBrandId, brands]);

  // Sync formData to store whenever critical fields change (debounced to avoid loops)
  useEffect(() => {
    const frameInput: FrameInput = {
      brand: formData.brand || '',
      subCategory: formData.subCategory || null,
      mrp: formData.mrp || 0,
      frameType: formData.frameType,
    };
    // Only sync if we have at least one field filled
    if (frameInput.brand || frameInput.mrp || frameInput.frameType) {
      setFrame(frameInput);
    }
  }, [formData.brand, formData.mrp, formData.frameType, formData.subCategory, setFrame]);

  const handleChange = (field: string, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    
    // Sync with Zustand store immediately on every change
    const frameInput: FrameInput = {
      brand: updated.brand || '',
      subCategory: updated.subCategory || null,
      mrp: updated.mrp || 0,
      frameType: updated.frameType,
    };
    console.log('[FrameEntryForm] Syncing to store:', frameInput);
    setFrame(frameInput);
  };

  const handleBrandChange = (brandId: string) => {
    setSelectedBrandId(brandId);
    // Brand name will be set in useEffect when selectedBrandId changes
    // Sub-brand will be reset automatically
  };

  const handleNext = () => {
    if (formData.brand && formData.mrp && formData.mrp > 0 && formData.frameType) {
      const frameInput: FrameInput = {
        brand: formData.brand,
        subCategory: formData.subCategory || null,
        mrp: formData.mrp,
        frameType: formData.frameType,
      };
      setFrame(frameInput);
      setCurrentStep(3);
    }
  };

  return (
    <div className="space-y-6">
      {/* WF-03: Header with step indicator */}
      <div className="flex items-center gap-3 mb-6">
        <Frame className="text-blue-600" size={28} />
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Step 2 of 5 – Your Frame</h2>
          {storeName && (
            <p className="text-sm text-slate-500 mt-1">{storeName}</p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-slate-600">Loading frame brands...</p>
        </div>
      ) : brands.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-red-600 mb-2">No frame brands available</p>
          <p className="text-sm text-slate-500">Please check your store code or contact support.</p>
          <p className="text-xs text-slate-400 mt-2">Store Code: {storeCode || localStorage.getItem('lenstrack_store_code') || 'Not set'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Frame Brand *"
            value={selectedBrandId}
            onChange={(e) => handleBrandChange(e.target.value)}
            options={[
              { value: '', label: 'Select Frame Brand...' },
              ...brands.map((brand) => ({
                value: brand.id,
                label: brand.brandName,
              })),
            ]}
            required
          />
          
          {selectedBrandId && availableSubBrands.length > 0 ? (
            <Select
              label="Sub-Brand"
              value={formData.subCategory || ''}
              onChange={(e) => handleChange('subCategory', e.target.value || null)}
              options={[
                { value: '', label: 'Select Sub-Brand (Optional)...' },
                ...availableSubBrands.map((sub) => ({
                  value: sub.subBrandName,
                  label: sub.subBrandName,
                })),
              ]}
            />
          ) : selectedBrandId ? (
            <div className="flex items-center h-10 text-sm text-slate-500">
              No sub-brands available for this brand
            </div>
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="MRP (₹) *"
          type="number"
          min="0"
          step="0.01"
          value={formData.mrp?.toString() || ''}
          onChange={(e) => handleChange('mrp', parseFloat(e.target.value) || 0)}
          placeholder="e.g., 2500"
          required
        />
        
        <Select
          label="Frame Type *"
          value={formData.frameType || ''}
          onChange={(e) => {
            const selectedValue = e.target.value;
            console.log('[FrameEntryForm] Frame type selected:', selectedValue);
            handleChange('frameType', selectedValue || undefined);
            // Immediately sync to store
            const updatedFrame: FrameInput = {
              brand: formData.brand || '',
              subCategory: formData.subCategory || null,
              mrp: formData.mrp || 0,
              frameType: (selectedValue as 'FULL_RIM' | 'HALF_RIM' | 'RIMLESS') || undefined,
            };
            console.log('[FrameEntryForm] Immediately syncing frame to store:', updatedFrame);
            setFrame(updatedFrame);
          }}
          options={[
            { value: '', label: 'Select Frame Type...' },
            ...frameTypes,
          ]}
          required
        />
      </div>

      {/* WF-03: Material field */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Material
        </label>
        <div className="flex flex-wrap gap-2">
          {materials.map((mat) => (
            <button
              key={mat.value}
              type="button"
              onClick={() => handleChange('material', mat.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                formData.material === mat.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {mat.label}
            </button>
          ))}
        </div>
      </div>

      {/* WF-03: Info text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          ℹ️ This information helps us apply the best offers (YOPO, Free Lens, Combos).
        </p>
      </div>

      {/* Navigation */}
      {!hideNextButton && (
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => setCurrentStep(1)}>
            ← Back
          </Button>
          <Button 
            onClick={handleNext} 
            size="lg" 
            disabled={!formData.brand || !formData.mrp || formData.mrp <= 0 || !formData.frameType}
          >
            Next: Your Lifestyle →
          </Button>
        </div>
      )}
    </div>
  );
}

