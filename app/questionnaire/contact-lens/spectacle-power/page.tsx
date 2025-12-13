'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Glasses, CheckCircle } from 'lucide-react';
import { useLensAdvisorStore } from '@/stores/lens-advisor-store';

export default function SpectaclePowerPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const rx = useLensAdvisorStore((state) => state.rx);
  const setRx = useLensAdvisorStore((state) => state.setRx);
  const [loading, setLoading] = useState(false);
  const [convertedPower, setConvertedPower] = useState<any>(null);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    // Verify method selection
    const method = localStorage.getItem('lenstrack_cl_power_method');
    if (method !== 'SPECTACLE') {
      router.push('/questionnaire/contact-lens/power-input-method');
      return;
    }

    // Load saved prescription
    const saved = localStorage.getItem('lenstrack_prescription');
    if (saved) {
      const rxData = JSON.parse(saved);
      setRx(rxData);
    }
  }, [setRx, router]);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Real-time validation function
  const validateInput = () => {
    const errors: string[] = [];

    // Check if at least one eye has power
    if (!rx.odSphere && !rx.osSphere) {
      errors.push('Please enter power for at least one eye');
    }

    // Validate SPH range
    if (rx.odSphere !== undefined && rx.odSphere !== null && (rx.odSphere < -20 || rx.odSphere > 20)) {
      errors.push('OD Sphere power must be between -20.00 and +20.00');
    }
    if (rx.osSphere !== undefined && rx.osSphere !== null && (rx.osSphere < -20 || rx.osSphere > 20)) {
      errors.push('OS Sphere power must be between -20.00 and +20.00');
    }

    // Validate CYL range
    if (rx.odCylinder !== undefined && rx.odCylinder !== null && (rx.odCylinder < -6 || rx.odCylinder > 0)) {
      errors.push('OD Cylinder power must be between -6.00 and 0.00');
    }
    if (rx.osCylinder !== undefined && rx.osCylinder !== null && (rx.osCylinder < -6 || rx.osCylinder > 0)) {
      errors.push('OS Cylinder power must be between -6.00 and 0.00');
    }

    // Validate AXIS range
    if (rx.odAxis !== undefined && rx.odAxis !== null && (rx.odAxis < 0 || rx.odAxis > 180)) {
      errors.push('OD Axis must be between 0° and 180°');
    }
    if (rx.osAxis !== undefined && rx.osAxis !== null && (rx.osAxis < 0 || rx.osAxis > 180)) {
      errors.push('OS Axis must be between 0° and 180°');
    }

    // Validate that AXIS is provided when CYL is present
    if (rx.odCylinder !== undefined && rx.odCylinder !== null && Math.abs(rx.odCylinder) > 0.01 && !rx.odAxis) {
      errors.push('OD Axis is required when cylinder is specified');
    }
    if (rx.osCylinder !== undefined && rx.osCylinder !== null && Math.abs(rx.osCylinder) > 0.01 && !rx.osAxis) {
      errors.push('OS Axis is required when cylinder is specified');
    }

    // Validate ADD range
    if (rx.odAdd !== undefined && rx.odAdd !== null && (rx.odAdd < 0 || rx.odAdd > 4)) {
      errors.push('OD Addition power must be between +0.75 and +3.50');
    }
    if (rx.osAdd !== undefined && rx.osAdd !== null && (rx.osAdd < 0 || rx.osAdd > 4)) {
      errors.push('OS Addition power must be between +0.75 and +3.50');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Real-time validation - runs automatically when rx values change
  useEffect(() => {
    validateInput();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rx.odSphere, rx.odCylinder, rx.odAxis, rx.odAdd, rx.osSphere, rx.osCylinder, rx.osAxis, rx.osAdd]);

  const handleConvert = async () => {
    // Validate prescription
    if (!validateInput()) {
      if (validationErrors.length > 0) {
        showToast('error', validationErrors[0]);
      }
      return;
    }

    setConverting(true);
    setValidationErrors([]);
    try {
      const response = await fetch('/api/contact-lens/convert-power', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spectaclePower: {
            odSphere: rx.odSphere,
            odCylinder: rx.odCylinder,
            odAxis: rx.odAxis,
            odAdd: rx.odAdd,
            osSphere: rx.osSphere,
            osCylinder: rx.osCylinder,
            osAxis: rx.osAxis,
            osAdd: rx.osAdd,
          },
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setConvertedPower(data.data);
        // Save converted power
        localStorage.setItem('lenstrack_cl_converted_power', JSON.stringify(data.data.contactLensPower));
        showToast('success', 'Power converted successfully');
      } else {
        // Extract error messages from details array (which might contain Zod error objects)
        let errorMessages: string[] = [];
        if (data.error?.details && Array.isArray(data.error.details)) {
          errorMessages = data.error.details.map((detail: any) => {
            if (typeof detail === 'string') {
              return detail;
            } else if (detail && typeof detail === 'object') {
              // Handle Zod error issue objects
              return detail.message || detail.path?.join('.') || JSON.stringify(detail);
            }
            return String(detail);
          });
        }
        
        const errorMsg = errorMessages[0] || data.error?.message || 'Failed to convert power';
        if (errorMessages.length === 0) {
          errorMessages = [errorMsg];
        }
        setValidationErrors(errorMessages);
        showToast('error', errorMsg);
      }
    } catch (error) {
      console.error('Error converting power:', error);
      showToast('error', 'An error occurred while converting power');
    } finally {
      setConverting(false);
    }
  };

  const handleConfirm = () => {
    if (!convertedPower) {
      showToast('error', 'Please convert power first');
      return;
    }

    // Save and proceed to questionnaire
    localStorage.setItem('lenstrack_cl_final_power', JSON.stringify(convertedPower.contactLensPower));
    router.push('/questionnaire/contact-lens/questionnaire');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 sm:p-6 lg:p-8 border border-slate-700 shadow-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-2 sm:gap-3">
            <Glasses size={24} className="sm:w-8 sm:h-8" />
            Enter Your Spectacle Power
          </h1>
          <p className="text-slate-300 mb-2">We'll convert this to contact lens power</p>
          <p className="text-sm text-slate-400 mb-6 italic">
            Contact lenses sit directly on the eye, so their power is adjusted slightly from spectacle numbers for safe and accurate vision.
          </p>

          <div className="bg-white rounded-xl p-6 space-y-6 mb-6">
            {/* Right Eye */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Right Eye (OD)</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">SPH</label>
                  <Input
                    type="number"
                    step="0.25"
                    value={rx.odSphere || ''}
                    onChange={(e) => setRx({ ...rx, odSphere: parseFloat(e.target.value) || undefined })}
                    placeholder="-2.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">CYL</label>
                  <Input
                    type="number"
                    step="0.25"
                    value={rx.odCylinder || ''}
                    onChange={(e) => setRx({ ...rx, odCylinder: parseFloat(e.target.value) || undefined })}
                    placeholder="-0.50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">AXIS</label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="180"
                    value={rx.odAxis || ''}
                    onChange={(e) => setRx({ ...rx, odAxis: parseInt(e.target.value) || undefined })}
                    placeholder="180"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">ADD</label>
                  <Input
                    type="number"
                    step="0.25"
                    value={rx.odAdd || ''}
                    onChange={(e) => setRx({ ...rx, odAdd: parseFloat(e.target.value) || undefined })}
                    placeholder="+2.00"
                  />
                </div>
              </div>
            </div>

            {/* Left Eye */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Left Eye (OS)</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">SPH</label>
                  <Input
                    type="number"
                    step="0.25"
                    value={rx.osSphere || ''}
                    onChange={(e) => setRx({ ...rx, osSphere: parseFloat(e.target.value) || undefined })}
                    placeholder="-2.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">CYL</label>
                  <Input
                    type="number"
                    step="0.25"
                    value={rx.osCylinder || ''}
                    onChange={(e) => setRx({ ...rx, osCylinder: parseFloat(e.target.value) || undefined })}
                    placeholder="-0.50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">AXIS</label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="180"
                    value={rx.osAxis || ''}
                    onChange={(e) => setRx({ ...rx, osAxis: parseInt(e.target.value) || undefined })}
                    placeholder="180"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">ADD</label>
                  <Input
                    type="number"
                    step="0.25"
                    value={rx.osAdd || ''}
                    onChange={(e) => setRx({ ...rx, osAdd: parseFloat(e.target.value) || undefined })}
                    placeholder="+2.00"
                  />
                </div>
              </div>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
                <h4 className="font-semibold text-red-900 mb-2">⚠️ Validation Errors:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, idx) => (
                    <li key={idx} className="text-sm text-red-700">
                      {typeof error === 'string' ? error : typeof error === 'object' && error !== null
                        ? (error as any).message || JSON.stringify(error)
                        : String(error)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              onClick={handleConvert}
              disabled={converting || (!rx.odSphere && !rx.osSphere) || validationErrors.length > 0}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 disabled:opacity-50"
            >
              {converting ? 'Converting...' : 'Convert to Contact Lens Power'}
            </Button>

            {/* Converted Power Display */}
            {convertedPower && (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <CheckCircle size={20} className="text-blue-600" />
                    Your Contact Lens Power:
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-white rounded p-3">
                      <div className="font-medium text-slate-700 mb-1">Right Eye (OD):</div>
                      <div className="text-lg font-semibold text-blue-700">{convertedPower.formatted.od}</div>
                      <div className="text-xs text-slate-500 mt-2 space-y-1">
                        {convertedPower.conversionDetails?.conversionInfo.od.isToric && (
                          <div>✓ Toric lens (|CYL| ≥ 0.75) - Both principal meridians converted</div>
                        )}
                        {convertedPower.conversionDetails?.conversionInfo.od.usedSphericalEquivalent && (
                          <div>✓ Spherical equivalent used (|CYL| ≤ 0.50)</div>
                        )}
                        {convertedPower.conversionDetails?.vertexConversionApplied.od && (
                          <div>✓ Vertex distance conversion applied (|SPH| ≥ 4.00D)</div>
                        )}
                        {convertedPower.conversionDetails?.addMappingApplied.od && (
                          <div>✓ Multifocal ADD mapped: {convertedPower.conversionDetails?.conversionInfo.od.addCategory || 'N/A'}</div>
                        )}
                      </div>
                    </div>
                    <div className="bg-white rounded p-3">
                      <div className="font-medium text-slate-700 mb-1">Left Eye (OS):</div>
                      <div className="text-lg font-semibold text-blue-700">{convertedPower.formatted.os}</div>
                      <div className="text-xs text-slate-500 mt-2 space-y-1">
                        {convertedPower.conversionDetails?.conversionInfo.os.isToric && (
                          <div>✓ Toric lens (|CYL| ≥ 0.75) - Both principal meridians converted</div>
                        )}
                        {convertedPower.conversionDetails?.conversionInfo.os.usedSphericalEquivalent && (
                          <div>✓ Spherical equivalent used (|CYL| ≤ 0.50)</div>
                        )}
                        {convertedPower.conversionDetails?.vertexConversionApplied.os && (
                          <div>✓ Vertex distance conversion applied (|SPH| ≥ 4.00D)</div>
                        )}
                        {convertedPower.conversionDetails?.addMappingApplied.os && (
                          <div>✓ Multifocal ADD mapped: {convertedPower.conversionDetails?.conversionInfo.os.addCategory || 'N/A'}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compatibility Summary */}
                <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                  <h4 className="font-semibold text-green-900 mb-3">Compatibility Summary</h4>
                  <div className="space-y-2 text-sm">
                    {/* Right Eye Summary */}
                    {convertedPower.contactLensPower.od.sphere !== null && (
                      <div className="bg-white rounded p-3">
                        <div className="font-medium text-slate-700 mb-2">Right Eye (OD):</div>
                        <div className="space-y-1 text-xs">
                          {convertedPower.conversionDetails?.conversionInfo.od.isToric && (
                            <>
                              <div className="text-green-700">✓ Toric lenses required (CYL {convertedPower.contactLensPower.od.cylinder !== null ? convertedPower.contactLensPower.od.cylinder.toFixed(2) : 'N/A'})</div>
                              {convertedPower.contactLensPower.od.axis !== null && (
                                <div className="text-green-700">✓ Axis {convertedPower.contactLensPower.od.axis}° → Supported</div>
                              )}
                            </>
                          )}
                          {convertedPower.conversionDetails?.conversionInfo.od.usedSphericalEquivalent && (
                            <div className="text-green-700">✓ Spherical lenses (SE applied)</div>
                          )}
                          {!convertedPower.conversionDetails?.conversionInfo.od.isToric && !convertedPower.conversionDetails?.conversionInfo.od.usedSphericalEquivalent && (
                            <div className="text-green-700">✓ Spherical lenses</div>
                          )}
                          <div className="text-green-700">✓ Recommended CL Sphere: {convertedPower.contactLensPower.od.sphere >= 0 ? '+' : ''}{convertedPower.contactLensPower.od.sphere.toFixed(2)}</div>
                          {convertedPower.contactLensPower.od.add !== null && convertedPower.contactLensPower.od.add > 0 ? (
                            <div className="text-green-700">✓ ADD Category: {convertedPower.conversionDetails?.conversionInfo.od.addCategory || 'N/A'}</div>
                          ) : (
                            <div className="text-slate-600">✓ ADD: Not required</div>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Left Eye Summary */}
                    {convertedPower.contactLensPower.os.sphere !== null && (
                      <div className="bg-white rounded p-3">
                        <div className="font-medium text-slate-700 mb-2">Left Eye (OS):</div>
                        <div className="space-y-1 text-xs">
                          {convertedPower.conversionDetails?.conversionInfo.os.isToric && (
                            <>
                              <div className="text-green-700">✓ Toric lenses required (CYL {convertedPower.contactLensPower.os.cylinder !== null ? convertedPower.contactLensPower.os.cylinder.toFixed(2) : 'N/A'})</div>
                              {convertedPower.contactLensPower.os.axis !== null && (
                                <div className="text-green-700">✓ Axis {convertedPower.contactLensPower.os.axis}° → Supported</div>
                              )}
                            </>
                          )}
                          {convertedPower.conversionDetails?.conversionInfo.os.usedSphericalEquivalent && (
                            <div className="text-green-700">✓ Spherical lenses (SE applied)</div>
                          )}
                          {!convertedPower.conversionDetails?.conversionInfo.os.isToric && !convertedPower.conversionDetails?.conversionInfo.os.usedSphericalEquivalent && (
                            <div className="text-green-700">✓ Spherical lenses</div>
                          )}
                          <div className="text-green-700">✓ Recommended CL Sphere: {convertedPower.contactLensPower.os.sphere >= 0 ? '+' : ''}{convertedPower.contactLensPower.os.sphere.toFixed(2)}</div>
                          {convertedPower.contactLensPower.os.add !== null && convertedPower.contactLensPower.os.add > 0 ? (
                            <div className="text-green-700">✓ ADD Category: {convertedPower.conversionDetails?.conversionInfo.os.addCategory || 'N/A'}</div>
                          ) : (
                            <div className="text-slate-600">✓ ADD: Not required</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => router.push('/questionnaire/contact-lens/power-input-method')}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Back
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!convertedPower}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 disabled:opacity-50"
            >
              <CheckCircle size={20} />
              Confirm Contact Lens Power
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

