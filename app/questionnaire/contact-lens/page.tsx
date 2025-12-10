'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ArrowLeft, Contact, Package } from 'lucide-react';
import { useSessionStore } from '@/stores/session-store';

type PackType = 'DAILY' | 'MONTHLY' | 'YEARLY';

interface ContactLensProduct {
  id: string;
  name: string;
  brand: string;
  mrp: number;
  packType?: PackType;
  packTypes?: PackType[];
  isAvailable?: boolean;
  isColorLens?: boolean;
  colorOptions?: string[];
}

export default function ContactLensPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const storeCode = useSessionStore((state) => state.storeCode);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ContactLensProduct[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedPack, setSelectedPack] = useState<PackType>('MONTHLY');
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [brands, setBrands] = useState<string[]>([]);

  useEffect(() => {
    // Verify Contact Lens is selected
    const savedLensType = localStorage.getItem('lenstrack_lens_type');
    if (savedLensType !== 'CONTACT_LENSES') {
      router.push('/questionnaire/lens-type');
      return;
    }

    // Verify power is entered
    const finalPower = localStorage.getItem('lenstrack_cl_final_power');
    if (!finalPower) {
      router.push('/questionnaire/contact-lens/power-input-method');
      return;
    }
    
    fetchContactLensProducts();
  }, [router]);

  const fetchContactLensProducts = async () => {
    setLoading(true);
    try {
      // Get power data
      const finalPower = localStorage.getItem('lenstrack_cl_final_power');
      const method = localStorage.getItem('lenstrack_cl_power_method') || 'CONTACT_LENS';
      const powerData = finalPower ? JSON.parse(finalPower) : null;

      if (!powerData) {
        router.push('/questionnaire/contact-lens/power-input-method');
        return;
      }

      // Use the search API which includes proper power range validation
      const searchResponse = await fetch('/api/contact-lens/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: method === 'SPECTACLE' ? 'SPECTACLE' : 'CONTACT_LENS',
          spectaclePower: method === 'SPECTACLE' ? {
            odSphere: powerData.od?.sphere,
            odCylinder: powerData.od?.cylinder,
            odAxis: powerData.od?.axis,
            odAdd: powerData.od?.add,
            osSphere: powerData.os?.sphere,
            osCylinder: powerData.os?.cylinder,
            osAxis: powerData.os?.axis,
            osAdd: powerData.os?.add,
          } : undefined,
          contactLensPower: method === 'CONTACT_LENS' ? {
            odSphere: powerData.od?.sphere,
            odCylinder: powerData.od?.cylinder,
            odAxis: powerData.od?.axis,
            odAdd: powerData.od?.add,
            osSphere: powerData.os?.sphere,
            osCylinder: powerData.os?.cylinder,
            osAxis: powerData.os?.axis,
            osAdd: powerData.os?.add,
          } : undefined,
        }),
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.success && searchData.data) {
          const productsList = searchData.data.products.map((p: any) => ({
            id: p.id,
            name: `${p.brand} ${p.line}`,
            brand: p.brand,
            line: p.line,
            modality: p.modality,
            lensType: p.lensType,
            packSize: p.packSize,
            mrp: p.mrp,
            offerPrice: p.offerPrice,
            isAvailable: p.isAvailable,
            packTypes: p.packTypes || [p.modality],
            isColorLens: p.isColorLens || false,
            colorOptions: p.colorOptions || [],
            powerRange: p.powerRange,
          }));
          
          setProducts(productsList);
          
          // Extract unique brands
          const uniqueBrands: string[] = Array.from(new Set<string>(productsList.map((p: ContactLensProduct) => p.brand)));
          setBrands(uniqueBrands);

          // Show error message if no products available
          if (searchData.data.error) {
            showToast('error', searchData.data.error.message);
          } else if (productsList.length === 0) {
            const powerStr = powerData.od?.sphere || powerData.os?.sphere 
              ? `OD: ${powerData.od?.sphere || 'N/A'}, OS: ${powerData.os?.sphere || 'N/A'}`
              : 'your power';
            showToast('error', `No contact lenses available for ${powerStr}. Please check with store staff for alternative options.`);
          } else {
            showToast('success', `Found ${productsList.length} contact lens option(s) available for your power`);
          }
        }
      } else {
        // Fallback to admin API if search fails
        const response = await fetch('/api/admin/contact-lens-products', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('lenstrack_token') || ''}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const productsList = data.data.map((p: any) => ({
              id: p.id,
              name: `${p.brand} ${p.line}`,
              brand: p.brand,
              line: p.line,
              modality: p.modality,
              lensType: p.lensType,
              packSize: p.packSize,
              mrp: p.mrp,
              offerPrice: p.offerPrice,
              isAvailable: true,
              packTypes: [p.modality],
              isColorLens: p.isColorLens || false,
              colorOptions: p.colorOptions ? (typeof p.colorOptions === 'string' ? JSON.parse(p.colorOptions) : p.colorOptions) : [],
            }));
            setProducts(productsList);
            
            const uniqueBrands: string[] = Array.from(new Set<string>(productsList.map((p: ContactLensProduct) => p.brand)));
            setBrands(uniqueBrands);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch contact lens products:', error);
      showToast('error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = selectedBrand
    ? products.filter(p => p.brand === selectedBrand)
    : products;

  const handleNext = async () => {
    if (!selectedProduct) {
      showToast('error', 'Please select a contact lens product');
      return;
    }

    const product = filteredProducts.find(p => p.id === selectedProduct);
    if (!product) {
      showToast('error', 'Selected product not found');
      return;
    }

    // Validate that product is available for the entered power
    if (product.isAvailable === false) {
      showToast('error', 'This product is not available for your prescription power. Please select a different product or consult with store staff.');
      return;
    }

    // Validate color selection for color lenses
    if (product.isColorLens && (!selectedColor || selectedColor.trim() === '')) {
      showToast('error', 'Please select a color for this contact lens');
      return;
    }

    setLoading(true);
    try {
      // Get customer details
      const customerDetails = JSON.parse(localStorage.getItem('lenstrack_customer_details') || '{}');
      
      // Create session for Contact Lens order
      const response = await fetch('/api/public/questionnaire/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeCode: storeCode || 'MAIN-001',
          category: 'CONTACT_LENSES',
          customerName: customerDetails?.name || undefined,
          customerPhone: customerDetails?.phone || undefined,
          customerEmail: customerDetails?.email || undefined,
          customerCategory: customerDetails?.category || undefined,
          // No prescription needed for Contact Lenses
          // No frame needed
        }),
      });

      const data = await response.json();
      
      if (data.success && data.data?.sessionId) {
        // Store contact lens selection
        localStorage.setItem(`lenstrack_contact_lens_${data.data.sessionId}`, JSON.stringify({
          productId: selectedProduct,
          productName: product.name,
          brand: product.brand,
          packType: selectedPack,
          quantity,
          mrp: product.mrp,
          selectedColor: product.isColorLens ? selectedColor : null,
        }));
        
        // Navigate to add-ons page
        router.push(`/questionnaire/${data.data.sessionId}/contact-lens-addons`);
      } else {
        showToast('error', data.error?.message || 'Failed to create session');
      }
    } catch (error) {
      console.error('Error creating contact lens session:', error);
      showToast('error', 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700 shadow-2xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Contact size={32} />
              Select Contact Lenses
            </h1>
            <p className="text-slate-300">Choose your contact lens brand and pack type</p>
          </div>

          <div className="bg-white rounded-xl p-6 space-y-6">
            {/* Brand Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Brand
              </label>
              <Select
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setSelectedProduct(''); // Reset product when brand changes
                }}
                options={[
                  { value: '', label: 'All Brands' },
                  ...brands.map(brand => ({ value: brand, label: brand })),
                ]}
              />
            </div>

            {/* Product Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Product
              </label>
              <Select
                value={selectedProduct}
                onChange={(e) => {
                  setSelectedProduct(e.target.value);
                  // Reset pack type and color when product changes
                  const product = filteredProducts.find(p => p.id === e.target.value);
                  if (product?.packTypes && product.packTypes.length > 0) {
                    setSelectedPack(product.packTypes[0]);
                  }
                  // Reset color selection
                  setSelectedColor('');
                }}
                options={[
                  { value: '', label: 'Select a product' },
                  ...filteredProducts.map(p => ({
                    value: p.id,
                    label: `${p.name} - ₹${p.mrp}${p.isAvailable === false ? ' (Not available in your power)' : ''}`,
                  })),
                ]}
                disabled={!selectedBrand && brands.length > 0}
              />
              {!selectedBrand && brands.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">Please select a brand first</p>
              )}
              {selectedProduct && filteredProducts.find(p => p.id === selectedProduct)?.isAvailable === false && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 font-medium">⚠️ Not Available in Your Power</p>
                  <p className="text-xs text-red-600 mt-1">This product does not support your prescription power. Please select a different product or consult with store staff.</p>
                </div>
              )}
              {filteredProducts.length === 0 && products.length > 0 && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700 font-medium">⚠️ No Products Available</p>
                  <p className="text-xs text-yellow-600 mt-1">No contact lenses are available for your power in the selected brand. Try selecting a different brand or consult with store staff.</p>
                </div>
              )}
              {products.length === 0 && !loading && (
                <div className="mt-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 font-medium">❌ No Contact Lenses Available</p>
                  <p className="text-xs text-red-600 mt-1">No contact lenses are available for your prescription power. Please check with store staff for alternative options or verify your power entry.</p>
                </div>
              )}
            </div>

            {/* Pack Type Selection */}
            {selectedProduct && (() => {
              const product = filteredProducts.find(p => p.id === selectedProduct);
              const availablePacks = product?.packTypes || ['DAILY', 'MONTHLY', 'YEARLY'];
              
              return (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Pack Type
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['DAILY', 'MONTHLY', 'YEARLY'] as PackType[]).map((pack) => {
                      const isAvailable = availablePacks.includes(pack);
                      return (
                        <button
                          key={pack}
                          type="button"
                          onClick={() => isAvailable && setSelectedPack(pack)}
                          disabled={!isAvailable}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            !isAvailable
                              ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                              : selectedPack === pack
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <Package size={24} className="mx-auto mb-2" />
                          <div className="font-semibold">{pack}</div>
                          {!isAvailable && (
                            <div className="text-xs mt-1">Not available</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Color Selection (if color lens) */}
            {selectedProduct && (() => {
              const product = filteredProducts.find(p => p.id === selectedProduct);
              if (product?.isColorLens && product.colorOptions && product.colorOptions.length > 0) {
                return (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Color <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {product.colorOptions.map((color: string) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            selectedColor === color
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="font-semibold text-sm">{color}</div>
                        </button>
                      ))}
                    </div>
                    {!selectedColor && (
                      <p className="text-xs text-red-500 mt-1">Please select a color</p>
                    )}
                  </div>
                );
              }
              return null;
            })()}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Quantity
              </label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-32"
              />
            </div>

            {/* Price Display */}
            {selectedProduct && (
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 font-medium">Total Price:</span>
                  <span className="text-2xl font-bold text-blue-700">
                    ₹{products.find(p => p.id === selectedProduct)?.mrp ? 
                      (products.find(p => p.id === selectedProduct)!.mrp * quantity).toLocaleString() : 
                      '0'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-6 border-t border-slate-700">
            <Button
              variant="outline"
              onClick={() => router.push('/questionnaire/lens-type')}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={loading || !selectedProduct || (products.find(p => p.id === selectedProduct)?.isColorLens && !selectedColor)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {loading ? 'Processing...' : 'Next: Add-ons →'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

