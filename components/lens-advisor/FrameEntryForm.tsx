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
import { Frame, Square, Circle, Minus } from 'lucide-react';

interface FrameBrand {
  id: string;
  brandName: string;
  subBrands: {
    id: string;
    subBrandName: string;
  }[];
}

const frameTypes = [
  { 
    value: 'FULL_RIM', 
    label: 'Full Rim',
    icon: (
      <svg 
        width="56" 
        height="24" 
        viewBox="0 0 291 127" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <circle cx="63.1883" cy="63.1882" r="53.5" transform="rotate(-2.09413 63.1883 63.1882)" stroke="#FB0B0B" strokeWidth="15" fill="none"/>
        <circle cx="227.322" cy="63.3982" r="53.5" transform="rotate(-2.09413 227.322 63.3982)" stroke="#F70C0C" strokeWidth="15" fill="none"/>
        <mask id="full-rim-bridge-mask" fill="white">
          <path d="M110.212 63.3496C110.191 55.4055 113.922 47.777 120.582 42.1422C127.242 36.5074 136.288 33.3279 145.728 33.3033C155.168 33.2786 164.229 36.4107 170.919 42.0105C177.609 47.6104 181.379 55.2193 181.4 63.1634L166.179 63.2032C166.167 58.6563 164.009 54.3012 160.18 51.096C156.351 47.8908 151.164 46.0981 145.761 46.1123C140.358 46.1264 135.181 47.9462 131.369 51.1714C127.556 54.3966 125.421 58.7629 125.433 63.3098L110.212 63.3496Z"/>
        </mask>
        <path d="M110.212 63.3496C110.191 55.4055 113.922 47.777 120.582 42.1422C127.242 36.5074 136.288 33.3279 145.728 33.3033C155.168 33.2786 164.229 36.4107 170.919 42.0105C177.609 47.6104 181.379 55.2193 181.4 63.1634L166.179 63.2032C166.167 58.6563 164.009 54.3012 160.18 51.096C156.351 47.8908 151.164 46.0981 145.761 46.1123C140.358 46.1264 135.181 47.9462 131.369 51.1714C127.556 54.3966 125.421 58.7629 125.433 63.3098L110.212 63.3496Z" fill="#FF0000" stroke="#FF1B1B" strokeWidth="14" mask="url(#full-rim-bridge-mask)"/>
      </svg>
    )
  },
  { 
    value: 'HALF_RIM', 
    label: 'Half Rim',
    icon: (
      <svg 
        width="56" 
        height="26" 
        viewBox="0 0 282 130" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <mask id="half-rim-bridge-mask" fill="white">
          <path d="M106.078 65.1397C106.058 57.1956 109.788 49.567 116.448 43.9322C123.109 38.2975 132.154 35.118 141.594 35.0933C151.034 35.0686 160.096 38.2007 166.785 43.8006C173.475 49.4004 177.245 57.0094 177.266 64.9535L162.045 64.9933C162.033 60.4463 159.875 56.0912 156.046 52.8861C152.217 49.6809 147.031 47.8882 141.627 47.9023C136.224 47.9164 131.047 49.7363 127.235 52.9614C123.423 56.1866 121.288 60.5529 121.299 65.0999L106.078 65.1397Z"/>
        </mask>
        <path d="M106.078 65.1397C106.058 57.1956 109.788 49.567 116.448 43.9322C123.109 38.2975 132.154 35.118 141.594 35.0933C151.034 35.0686 160.096 38.2007 166.785 43.8006C173.475 49.4004 177.245 57.0094 177.266 64.9535L162.045 64.9933C162.033 60.4463 159.875 56.0912 156.046 52.8861C152.217 49.6809 147.031 47.8882 141.627 47.9023C136.224 47.9164 131.047 49.7363 127.235 52.9614C123.423 56.1866 121.288 60.5529 121.299 65.0999L106.078 65.1397Z" fill="#FF0000" stroke="#FF1B1B" strokeWidth="14" mask="url(#half-rim-bridge-mask)"/>
        <path d="M121 65C121 47.7609 114.626 31.2279 103.28 19.0381C91.934 6.8482 76.5456 1.30151e-06 60.5 0C44.4544 -1.30151e-06 29.066 6.84819 17.72 19.0381C6.37409 31.2279 2.42282e-06 47.7609 0 65L14.8501 65C14.8501 51.9924 19.6597 39.5175 28.2207 30.3197C36.7817 21.1219 48.3929 15.9547 60.5 15.9547C72.6071 15.9547 84.2183 21.122 92.7793 30.3197C101.34 39.5175 106.15 51.9924 106.15 65H121Z" fill="#FF2626"/>
        <path d="M5.46952 66.353C5.84318 81.0405 12.0963 94.9764 22.8534 105.095C33.6104 115.214 47.9902 120.686 62.8293 120.309C77.6683 119.931 91.7512 113.735 101.98 103.082C112.208 92.4295 117.745 78.1936 117.371 63.5062L113.88 63.595C114.23 77.366 109.039 90.7136 99.449 100.701C89.8586 110.689 76.6545 116.499 62.7413 116.853C48.8282 117.207 35.3457 112.076 25.2599 102.589C15.1741 93.1015 9.31111 80.0352 8.96076 66.2642L5.46952 66.353Z" fill="#FF2626"/>
        <path d="M165.409 63.226C165.783 77.9135 172.036 91.8495 182.793 101.968C193.55 112.087 207.93 117.559 222.769 117.182C237.608 116.804 251.691 110.608 261.919 99.9551C272.148 89.3026 277.684 75.0667 277.311 60.3792L273.819 60.468C274.17 74.239 268.979 87.5866 259.388 97.5745C249.798 107.562 236.594 113.372 222.681 113.726C208.768 114.08 195.285 108.949 185.199 99.4619C175.113 89.9746 169.25 76.9082 168.9 63.1372L165.409 63.226Z" fill="#FF2626"/>
        <path d="M282 65C282 47.7609 275.626 31.2279 264.28 19.0381C252.934 6.8482 237.546 1.30151e-06 221.5 0C205.454 -1.30151e-06 190.066 6.84819 178.72 19.0381C167.374 31.2279 161 47.7609 161 65L175.85 65C175.85 51.9924 180.66 39.5175 189.221 30.3197C197.782 21.1219 209.393 15.9547 221.5 15.9547C233.607 15.9547 245.218 21.122 253.779 30.3197C262.34 39.5175 267.15 51.9924 267.15 65H282Z" fill="#FF2626"/>
      </svg>
    )
  },
  { 
    value: 'RIMLESS', 
    label: 'Rimless',
    icon: (
      <svg 
        width="56" 
        height="24" 
        viewBox="0 0 291 127" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <circle cx="63.1883" cy="63.1882" r="60.5" transform="rotate(-2.09413 63.1883 63.1882)" stroke="#FB0B0B" strokeWidth="2" fill="none"/>
        <circle cx="227.322" cy="63.3982" r="60.5" transform="rotate(-2.09413 227.322 63.3982)" stroke="#F70C0C" strokeWidth="2" fill="none"/>
        <mask id="rimless-bridge-mask" fill="white">
          <path d="M121.871 63.319C121.85 55.3749 124.314 47.7497 128.721 42.1208C133.128 36.4919 139.117 33.3204 145.371 33.304C151.624 33.2877 157.63 36.4278 162.066 42.0335C166.503 47.6393 169.007 55.2515 169.027 63.1956L165.679 63.2044C165.661 56.3884 163.513 49.857 159.706 45.0473C155.9 40.2375 150.747 37.5433 145.382 37.5574C140.016 37.5714 134.878 40.2925 131.097 45.1221C127.315 49.9517 125.201 56.4942 125.219 63.3102L121.871 63.319Z"/>
        </mask>
        <path d="M121.871 63.319C121.85 55.3749 124.314 47.7497 128.721 42.1208C133.128 36.4919 139.117 33.3204 145.371 33.304C151.624 33.2877 157.63 36.4278 162.066 42.0335C166.503 47.6393 169.007 55.2515 169.027 63.1956L165.679 63.2044C165.661 56.3884 163.513 49.857 159.706 45.0473C155.9 40.2375 150.747 37.5433 145.382 37.5574C140.016 37.5714 134.878 40.2925 131.097 45.1221C127.315 49.9517 125.201 56.4942 125.219 63.3102L121.871 63.319Z" fill="#A43131" stroke="#FF1B1B" strokeWidth="6" mask="url(#rimless-bridge-mask)"/>
      </svg>
    )
  },
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
      {/* Progress Bar Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Your Frame</h2>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Step 2 of 5</span>
        </div>
          {storeName && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{storeName}</p>
          )}
        
        {/* Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: '40%' }}
          ></div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-slate-600 dark:text-slate-400">Loading frame brands...</p>
        </div>
      ) : brands.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-red-600 dark:text-red-400 mb-2">No frame brands available</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Please check your store code or contact support.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Store Code: {storeCode || localStorage.getItem('lenstrack_store_code') || 'Not set'}</p>
        </div>
      ) : (
        <div className="space-y-4">
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
            <div className="flex items-center h-10 text-sm text-slate-500 dark:text-slate-400">
              No sub-brands available for this brand
            </div>
          ) : null}
        </div>
      )}

      <div className="space-y-4">
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
        
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Frame Type * <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {frameTypes.map((type) => {
              const isSelected = formData.frameType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    console.log('[FrameEntryForm] Frame type selected:', type.value);
                    handleChange('frameType', type.value as 'FULL_RIM' | 'HALF_RIM' | 'RIMLESS');
            // Immediately sync to store
            const updatedFrame: FrameInput = {
              brand: formData.brand || '',
              subCategory: formData.subCategory || null,
              mrp: formData.mrp || 0,
                      frameType: type.value as 'FULL_RIM' | 'HALF_RIM' | 'RIMLESS',
            };
            console.log('[FrameEntryForm] Immediately syncing frame to store:', updatedFrame);
            setFrame(updatedFrame);
          }}
                  className={`flex flex-col items-center justify-center gap-3 p-5 rounded-lg border-2 transition-all min-h-[110px] ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className={`flex items-center justify-center ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    <div className="w-16 h-10 flex items-center justify-center">
                      {type.icon}
                    </div>
                  </div>
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* WF-03: Material field */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
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
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {mat.label}
            </button>
          ))}
        </div>
      </div>

      {/* WF-03: Info text */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          ℹ️ This information helps us apply the best offers (YOPO, Free Lens, Combos).
        </p>
      </div>

      {/* Navigation */}
      {!hideNextButton && (
        <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
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

