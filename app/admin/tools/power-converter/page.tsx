'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Glasses, Contact, CheckCircle, ShoppingCart, ArrowRight } from 'lucide-react';

interface ConvertedPower {
  od: {
    sphere: number | null;
    cylinder: number | null;
    axis: number | null;
    add: number | null;
  };
  os: {
    sphere: number | null;
    cylinder: number | null;
    axis: number | null;
    add: number | null;
  };
}

interface ContactLensProduct {
  id: string;
  name: string;
  brand: string;
  line: string;
  mrp: number;
  isAvailable: boolean;
}

export default function PowerConverterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  
  const [rx, setRx] = useState({
    odSphere: '',
    odCylinder: '',
    odAxis: '',
    odAdd: '',
    osSphere: '',
    osCylinder: '',
    osAxis: '',
    osAdd: '',
  });
  
  const [convertedPower, setConvertedPower] = useState<ConvertedPower | null>(null);
  const [conversionDetails, setConversionDetails] = useState<any>(null);
  const [compatibleProducts, setCompatibleProducts] = useState<ContactLensProduct[]>([]);
  const [converting, setConverting] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const handleConvert = async () => {
    // Validate at least one eye has power
    if (!rx.odSphere && !rx.osSphere) {
      showToast('error', 'Please enter at least one eye power');
      return;
    }

    setConverting(true);
    try {
      const response = await fetch('/api/contact-lens/convert-power', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spectaclePower: {
            odSphere: rx.odSphere ? parseFloat(rx.odSphere) : undefined,
            odCylinder: rx.odCylinder ? parseFloat(rx.odCylinder) : undefined,
            odAxis: rx.odAxis ? parseInt(rx.odAxis) : undefined,
            odAdd: rx.odAdd ? parseFloat(rx.odAdd) : undefined,
            osSphere: rx.osSphere ? parseFloat(rx.osSphere) : undefined,
            osCylinder: rx.osCylinder ? parseFloat(rx.osCylinder) : undefined,
            osAxis: rx.osAxis ? parseInt(rx.osAxis) : undefined,
            osAdd: rx.osAdd ? parseFloat(rx.osAdd) : undefined,
          },
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setConvertedPower(data.data.contactLensPower);
        setConversionDetails(data.data.conversionDetails);
        // Fetch compatible products
        await fetchCompatibleProducts(data.data.contactLensPower);
      } else {
        showToast('error', data.error?.message || 'Failed to convert power');
      }
    } catch (error) {
      console.error('Error converting power:', error);
      showToast('error', 'An error occurred');
    } finally {
      setConverting(false);
    }
  };

  const fetchCompatibleProducts = async (clPower: ConvertedPower) => {
    setLoadingProducts(true);
    try {
      const response = await fetch('/api/contact-lens/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'CONTACT_LENS',
          contactLensPower: {
            odSphere: clPower.od.sphere ?? undefined,
            odCylinder: clPower.od.cylinder ?? undefined,
            odAxis: clPower.od.axis ?? undefined,
            odAdd: clPower.od.add ?? undefined,
            osSphere: clPower.os.sphere ?? undefined,
            osCylinder: clPower.os.cylinder ?? undefined,
            osAxis: clPower.os.axis ?? undefined,
            osAdd: clPower.os.add ?? undefined,
          },
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setCompatibleProducts(data.data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const formatPower = (power: ConvertedPower['od'] | ConvertedPower['os']) => {
    if (power.sphere === null && power.cylinder === null) return 'Plano';
    
    let result = '';
    if (power.sphere !== null) {
      result += power.sphere >= 0 ? `+${power.sphere.toFixed(2)}` : power.sphere.toFixed(2);
    }
    
    if (power.cylinder !== null && power.cylinder !== 0) {
      result += ` / ${power.cylinder >= 0 ? `+${power.cylinder.toFixed(2)}` : power.cylinder.toFixed(2)}`;
      if (power.axis !== null) {
        result += ` × ${power.axis}`;
      }
    }
    
    if (power.add !== null && power.add > 0) {
      result += ` ADD +${power.add.toFixed(2)}`;
    }
    
    return result || 'Plano';
  };

  const handleStartOrder = () => {
    if (!convertedPower) {
      showToast('error', 'Please convert power first');
      return;
    }

    // Save power data for Contact Lens flow
    localStorage.setItem('lenstrack_cl_power_method', 'SPECTACLE');
    localStorage.setItem('lenstrack_cl_final_power', JSON.stringify(convertedPower));
    localStorage.setItem('lenstrack_prescription', JSON.stringify({
      odSphere: rx.odSphere ? parseFloat(rx.odSphere) : undefined,
      odCylinder: rx.odCylinder ? parseFloat(rx.odCylinder) : undefined,
      odAxis: rx.odAxis ? parseInt(rx.odAxis) : undefined,
      odAdd: rx.odAdd ? parseFloat(rx.odAdd) : undefined,
      osSphere: rx.osSphere ? parseFloat(rx.osSphere) : undefined,
      osCylinder: rx.osCylinder ? parseFloat(rx.osCylinder) : undefined,
      osAxis: rx.osAxis ? parseInt(rx.osAxis) : undefined,
      osAdd: rx.osAdd ? parseFloat(rx.osAdd) : undefined,
    }));
    localStorage.setItem('lenstrack_lens_type', 'CONTACT_LENSES');

    // Navigate to Contact Lens product selection
    router.push('/questionnaire/contact-lens');
  };

  return (
    <div className="min-h-safe-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2 sm:gap-3">
              <Glasses size={24} className="sm:w-8 sm:h-8 text-blue-600" />
              Contact Lens Power Converter
            </h1>
            <p className="text-sm sm:text-base text-slate-600">Convert spectacle power to contact lens power and find compatible products</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Power Input */}
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Enter Spectacle Power</h2>
                
                {/* Right Eye (OD) */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Right Eye (OD)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">SPH</label>
                      <Input
                        type="number"
                        step="0.25"
                        placeholder="e.g., -2.00"
                        value={rx.odSphere}
                        onChange={(e) => setRx({ ...rx, odSphere: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">CYL</label>
                      <Input
                        type="number"
                        step="0.25"
                        placeholder="e.g., -0.50"
                        value={rx.odCylinder}
                        onChange={(e) => setRx({ ...rx, odCylinder: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">AXIS</label>
                      <Input
                        type="number"
                        step="1"
                        placeholder="e.g., 180"
                        value={rx.odAxis}
                        onChange={(e) => setRx({ ...rx, odAxis: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">ADD</label>
                      <Input
                        type="number"
                        step="0.25"
                        placeholder="e.g., +2.00"
                        value={rx.odAdd}
                        onChange={(e) => setRx({ ...rx, odAdd: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Left Eye (OS) */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Left Eye (OS)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">SPH</label>
                      <Input
                        type="number"
                        step="0.25"
                        placeholder="e.g., -2.00"
                        value={rx.osSphere}
                        onChange={(e) => setRx({ ...rx, osSphere: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">CYL</label>
                      <Input
                        type="number"
                        step="0.25"
                        placeholder="e.g., -0.50"
                        value={rx.osCylinder}
                        onChange={(e) => setRx({ ...rx, osCylinder: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">AXIS</label>
                      <Input
                        type="number"
                        step="1"
                        placeholder="e.g., 180"
                        value={rx.osAxis}
                        onChange={(e) => setRx({ ...rx, osAxis: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">ADD</label>
                      <Input
                        type="number"
                        step="0.25"
                        placeholder="e.g., +2.00"
                        value={rx.osAdd}
                        onChange={(e) => setRx({ ...rx, osAdd: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleConvert}
                  disabled={converting}
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
                >
                  {converting ? 'Converting...' : 'Convert to Contact Lens Power'}
                </Button>
              </div>

              {/* Converted Power Display */}
              {convertedPower && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <CheckCircle size={24} className="text-green-600" />
                    Converted Contact Lens Power
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm font-semibold text-slate-700">Right Eye (OD):</span>
                      <div className="mt-1 text-lg font-bold text-green-700">{formatPower(convertedPower.od)}</div>
                      {rx.odSphere && (
                        <div className="text-xs text-slate-500 mt-1">
                          Original: {parseFloat(rx.odSphere) >= 0 ? '+' : ''}{parseFloat(rx.odSphere).toFixed(2)}D
                          {convertedPower.od.sphere !== null && (
                            <span className="ml-2">
                              → {convertedPower.od.sphere >= 0 ? '+' : ''}{convertedPower.od.sphere.toFixed(2)}D
                            </span>
                          )}
                        </div>
                      )}
                      {conversionDetails?.conversionInfo?.od?.isToric && (
                        <div className="text-xs text-slate-500 mt-1">
                          ✓ Toric lens (|CYL| ≥ 0.75)
                        </div>
                      )}
                      {conversionDetails?.conversionInfo?.od?.usedSphericalEquivalent && (
                        <div className="text-xs text-slate-500 mt-1">
                          ✓ Spherical equivalent used (|CYL| ≤ 0.50)
                        </div>
                      )}
                      {conversionDetails?.vertexConversionApplied?.od && (
                        <div className="text-xs text-slate-500 mt-1">
                          ✓ Vertex conversion applied (|SPH| ≥ 4.00D)
                        </div>
                      )}
                      {conversionDetails?.addMappingApplied?.od && conversionDetails?.conversionInfo?.od?.addCategory && (
                        <div className="text-xs text-slate-500 mt-1">
                          ✓ ADD mapped: {conversionDetails.conversionInfo.od.addCategory}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-slate-700">Left Eye (OS):</span>
                      <div className="mt-1 text-lg font-bold text-green-700">{formatPower(convertedPower.os)}</div>
                      {rx.osSphere && (
                        <div className="text-xs text-slate-500 mt-1">
                          Original: {parseFloat(rx.osSphere) >= 0 ? '+' : ''}{parseFloat(rx.osSphere).toFixed(2)}D
                          {convertedPower.os.sphere !== null && (
                            <span className="ml-2">
                              → {convertedPower.os.sphere >= 0 ? '+' : ''}{convertedPower.os.sphere.toFixed(2)}D
                            </span>
                          )}
                        </div>
                      )}
                      {conversionDetails?.conversionInfo?.os?.isToric && (
                        <div className="text-xs text-slate-500 mt-1">
                          ✓ Toric lens (|CYL| ≥ 0.75)
                        </div>
                      )}
                      {conversionDetails?.conversionInfo?.os?.usedSphericalEquivalent && (
                        <div className="text-xs text-slate-500 mt-1">
                          ✓ Spherical equivalent used (|CYL| ≤ 0.50)
                        </div>
                      )}
                      {conversionDetails?.vertexConversionApplied?.os && (
                        <div className="text-xs text-slate-500 mt-1">
                          ✓ Vertex conversion applied (|SPH| ≥ 4.00D)
                        </div>
                      )}
                      {conversionDetails?.addMappingApplied?.os && conversionDetails?.conversionInfo?.os?.addCategory && (
                        <div className="text-xs text-slate-500 mt-1">
                          ✓ ADD mapped: {conversionDetails.conversionInfo.os.addCategory}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Compatible Products */}
            <div>
              <div className="bg-slate-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Contact size={24} className="text-blue-600" />
                  Compatible Products
                </h2>

                {loadingProducts ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 mx-auto mb-2 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-slate-600">Loading products...</p>
                  </div>
                ) : compatibleProducts.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {compatibleProducts.map((product) => (
                      <div
                        key={product.id}
                        className={`p-4 rounded-lg border-2 ${
                          product.isAvailable
                            ? 'border-green-200 bg-green-50'
                            : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-slate-900">{product.name}</h3>
                            <p className="text-sm text-slate-600">{product.brand} {product.line}</p>
                            <p className="text-lg font-bold text-slate-900 mt-1">₹{product.mrp}</p>
                          </div>
                          {product.isAvailable ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                              Available
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                              Not Available
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : convertedPower ? (
                  <div className="text-center py-8 text-slate-600">
                    <p>No compatible products found for this power.</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <p>Convert power to see compatible products</p>
                  </div>
                )}

                {convertedPower && compatibleProducts.length > 0 && (
                  <Button
                    onClick={handleStartOrder}
                    className="w-full mt-6 bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={20} />
                    Start Order
                    <ArrowRight size={18} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

