'use client';

/**
 * Step 1: Prescription Entry Form
 * Enhanced with table format, PD field, help toggle, and index summary panel
 */

import { useLensAdvisorStore, RxInput } from '@/stores/lens-advisor-store';
import { useSessionStore } from '@/stores/session-store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Eye, HelpCircle, AlertTriangle, Info, X } from 'lucide-react';
import { IndexRecommendationService } from '@/services/index-recommendation.service';
import { useMemo, useState } from 'react';

interface PrescriptionFormProps {
  hideNextButton?: boolean;
  onNext?: () => void;
  onSkip?: () => void;
}

export function PrescriptionForm({ hideNextButton = false, onNext, onSkip }: PrescriptionFormProps = {}) {
  const rx = useLensAdvisorStore((state) => state.rx);
  const setRx = useLensAdvisorStore((state) => state.setRx);
  const setCurrentStep = useLensAdvisorStore((state) => state.setCurrentStep);
  const frame = useLensAdvisorStore((state) => state.frame);
  const indexService = new IndexRecommendationService();
  const [showHelp, setShowHelp] = useState(false);
  const [pd, setPd] = useState<number | null>(null);

  // Calculate maximum power for warnings
  const maxPower = useMemo(() => {
    const powers = [
      Math.abs(rx.odSphere || 0),
      Math.abs(rx.osSphere || 0),
      Math.abs((rx.odSphere || 0) + (rx.odCylinder || 0)),
      Math.abs((rx.osSphere || 0) + (rx.osCylinder || 0)),
    ].filter(p => p > 0);
    return powers.length > 0 ? Math.max(...powers) : 0;
  }, [rx]);

  // Check if power is beyond safe limits
  const isVeryHighPower = maxPower > 8;
  const isExtremePower = maxPower > 12;
  const isHighPower = maxPower > 5 && maxPower <= 8;

  // Calculate recommended index
  const recommendedIndex = useMemo(() => {
    if (!rx.odSphere && !rx.osSphere) return null;
    
    const rxInput = {
      rSph: rx.odSphere || null,
      rCyl: rx.odCylinder || null,
      rAxis: rx.odAxis || null,
      rAdd: rx.odAdd || null,
      lSph: rx.osSphere || null,
      lCyl: rx.osCylinder || null,
      lAxis: rx.osAxis || null,
      lAdd: rx.osAdd || null,
    };
    
    try {
      return indexService.recommendIndex(rxInput, frame);
    } catch {
      return null;
    }
  }, [rx, frame]);

  // Validation errors
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    
    if (rx.odSphere !== undefined && rx.odSphere !== null) {
      if (rx.odSphere < -20 || rx.odSphere > 20) {
        errors.odSphere = 'SPH must be between -20 and +20';
      }
    }
    if (rx.osSphere !== undefined && rx.osSphere !== null) {
      if (rx.osSphere < -20 || rx.osSphere > 20) {
        errors.osSphere = 'SPH must be between -20 and +20';
      }
    }
    if (rx.odCylinder !== undefined && rx.odCylinder !== null && rx.odCylinder > 0) {
      errors.odCylinder = 'CYL must be negative or zero';
    }
    if (rx.osCylinder !== undefined && rx.osCylinder !== null && rx.osCylinder > 0) {
      errors.osCylinder = 'CYL must be negative or zero';
    }
    if (rx.odAxis !== undefined && rx.odAxis !== null) {
      if (rx.odAxis < 0 || rx.odAxis > 180) {
        errors.odAxis = 'Axis must be between 0 and 180';
      }
    }
    if (rx.osAxis !== undefined && rx.osAxis !== null) {
      if (rx.osAxis < 0 || rx.osAxis > 180) {
        errors.osAxis = 'Axis must be between 0 and 180';
      }
    }
    
    return errors;
  }, [rx]);

  const handleChange = (field: keyof RxInput, value: any) => {
    setRx({ ...rx, [field]: value });
  };

  const handleNext = () => {
    // Check if there are validation errors
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    // Validation: SPH ±20 range, CYL negative only
    const isValid =
      (rx.odSphere === undefined || rx.odSphere === null || (rx.odSphere >= -20 && rx.odSphere <= 20)) &&
      (rx.osSphere === undefined || rx.osSphere === null || (rx.osSphere >= -20 && rx.osSphere <= 20)) &&
      (rx.odCylinder === undefined || rx.odCylinder === null || rx.odCylinder <= 0) &&
      (rx.osCylinder === undefined || rx.osCylinder === null || rx.osCylinder <= 0);

    if (isValid) {
      if (onNext) {
        onNext();
      } else {
        setCurrentStep(2);
      }
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      setCurrentStep(2);
    }
  };

  // Auto-suggest vision type based on ADD
  const getVisionType = (): 'SINGLE_VISION' | 'BIFOCAL' | 'PROGRESSIVE' | null => {
    const hasAdd = (rx.odAdd && rx.odAdd > 0) || (rx.osAdd && rx.osAdd > 0);
    if (!hasAdd) return 'SINGLE_VISION';
    // Could add more logic here
    return 'PROGRESSIVE';
  };

  // Get current vision type (user selected or auto-detected)
  const currentVisionType = rx.visionType || getVisionType() || 'SINGLE_VISION';
  
  // Show ADD fields only for PROGRESSIVE and BIFOCAL
  const showAddFields = currentVisionType === 'PROGRESSIVE' || currentVisionType === 'BIFOCAL';

  // Handle vision type change - clear ADD if switching to SINGLE_VISION
  const handleVisionTypeChange = (value: string) => {
    const newVisionType = value as 'SINGLE_VISION' | 'BIFOCAL' | 'PROGRESSIVE' | '';
    if (newVisionType === 'SINGLE_VISION' || newVisionType === '') {
      // Clear ADD values when switching to SINGLE_VISION
      setRx({ ...rx, visionType: newVisionType || null, odAdd: null, osAdd: null });
    } else {
      setRx({ ...rx, visionType: newVisionType as any });
    }
  };

  return (
    <div className="lg:flex lg:gap-6">
      {/* Main Form Section */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Eye className="text-blue-600" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Step 1 of 5 – Your Eye Power</h2>
            <p className="text-slate-600">Enter your prescription</p>
          </div>
        </div>

        {/* "I don't know my power" Toggle */}
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 w-full text-left"
          >
            <HelpCircle size={16} />
            <span className="font-medium">I don't know my power</span>
            {showHelp ? <X size={16} className="ml-auto" /> : <Info size={16} className="ml-auto" />}
          </button>
          
          {showHelp && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-700 mb-2">
                <strong>How to find your prescription:</strong>
              </p>
              <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                <li>Check your previous prescription slip from your optometrist</li>
                <li>Look for numbers like: SPH, CYL, AXIS, ADD</li>
                <li>Right Eye (OD) and Left Eye (OS) values are usually listed separately</li>
                <li>If you can't find it, visit your nearest optometrist for an eye exam</li>
                <li>You can also skip this step and enter it later</li>
              </ul>
            </div>
          )}
        </div>

        {/* Extreme Power Warning Banner */}
        {isExtremePower && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 mb-1">
                This power may need custom lenses
              </p>
              <p className="text-xs text-amber-800">
                Your prescription ({maxPower.toFixed(2)}D) is beyond standard lens ranges. Our staff will help you find the best solution. You can still continue to view options.
              </p>
            </div>
          </div>
        )}

        {/* Rx Form Table */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Eye</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">SPH</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">CYL</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">AXIS</th>
                  {showAddFields && (
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">ADD</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* Right Eye (OD) */}
                <tr>
                  <td className="px-4 py-4 text-sm font-medium text-slate-900">
                    Right Eye (OD)
                  </td>
                  <td className="px-4 py-4">
                    <Input
                      type="number"
                      step="0.25"
                      min="-20"
                      max="20"
                      value={rx.odSphere?.toString() || ''}
                      onChange={(e) => handleChange('odSphere', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="e.g., -2.50"
                      error={validationErrors.odSphere}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <Input
                      type="number"
                      step="0.25"
                      max="0"
                      value={rx.odCylinder?.toString() || ''}
                      onChange={(e) => handleChange('odCylinder', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="e.g., -0.75"
                      error={validationErrors.odCylinder}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <Input
                      type="number"
                      min="0"
                      max="180"
                      value={rx.odAxis?.toString() || ''}
                      onChange={(e) => handleChange('odAxis', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="0-180"
                      error={validationErrors.odAxis}
                    />
                  </td>
                  {showAddFields && (
                    <td className="px-4 py-4">
                      <Input
                        type="number"
                        step="0.25"
                        value={rx.odAdd?.toString() || ''}
                        onChange={(e) => handleChange('odAdd', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="e.g., +2.00"
                      />
                    </td>
                  )}
                </tr>
                
                {/* Left Eye (OS) */}
                <tr>
                  <td className="px-4 py-4 text-sm font-medium text-slate-900">
                    Left Eye (OS)
                  </td>
                  <td className="px-4 py-4">
                    <Input
                      type="number"
                      step="0.25"
                      min="-20"
                      max="20"
                      value={rx.osSphere?.toString() || ''}
                      onChange={(e) => handleChange('osSphere', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="e.g., -2.50"
                      error={validationErrors.osSphere}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <Input
                      type="number"
                      step="0.25"
                      max="0"
                      value={rx.osCylinder?.toString() || ''}
                      onChange={(e) => handleChange('osCylinder', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="e.g., -0.75"
                      error={validationErrors.osCylinder}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <Input
                      type="number"
                      min="0"
                      max="180"
                      value={rx.osAxis?.toString() || ''}
                      onChange={(e) => handleChange('osAxis', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="0-180"
                      error={validationErrors.osAxis}
                    />
                  </td>
                  {showAddFields && (
                    <td className="px-4 py-4">
                      <Input
                        type="number"
                        step="0.25"
                        value={rx.osAdd?.toString() || ''}
                        onChange={(e) => handleChange('osAdd', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="e.g., +2.00"
                      />
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* PD Field */}
        <div>
          <Input
            label="PD (Pupillary Distance) - Optional"
            type="number"
            step="0.5"
            min="50"
            max="75"
            value={pd?.toString() || ''}
            onChange={(e) => setPd(e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="e.g., 62.5"
          />
          <p className="text-xs text-slate-500 mt-1">
            PD is the distance between your pupils. Usually measured by your optometrist. If not available, we can measure it in-store.
          </p>
        </div>

      {/* Vision Type Suggestion */}
      <div>
        <Select
          label="Vision Type (auto-suggested, can override)"
          value={rx.visionType || getVisionType() || ''}
          onChange={(e) => handleVisionTypeChange(e.target.value)}
          options={[
            { value: '', label: 'Auto-detect' },
            { value: 'SINGLE_VISION', label: 'Single Vision' },
            { value: 'BIFOCAL', label: 'Bifocal' },
            { value: 'PROGRESSIVE', label: 'Progressive' },
          ]}
        />
        {!showAddFields && (
          <p className="text-sm text-slate-500 mt-1">
            ℹ️ ADD field is not available for Single Vision. Switch to Bifocal or Progressive to enter ADD values.
          </p>
        )}
      </div>

        {/* Vision Type Suggestion */}
        <div>
          <Select
            label="Vision Type (auto-suggested, can override)"
            value={rx.visionType || getVisionType() || ''}
            onChange={(e) => handleVisionTypeChange(e.target.value)}
            options={[
              { value: '', label: 'Auto-detect' },
              { value: 'SINGLE_VISION', label: 'Single Vision' },
              { value: 'BIFOCAL', label: 'Bifocal' },
              { value: 'PROGRESSIVE', label: 'Progressive' },
            ]}
          />
          {!showAddFields && (
            <p className="text-sm text-slate-500 mt-1">
              ℹ️ ADD field is not available for Single Vision. Switch to Bifocal or Progressive to enter ADD values.
            </p>
          )}
        </div>

        {/* Navigation - Primary CTA: Next, Secondary CTA: Skip */}
        {!hideNextButton && (
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleSkip}>
              Skip
            </Button>
            <Button 
              onClick={handleNext} 
              size="lg"
              disabled={Object.keys(validationErrors).length > 0}
            >
              Next: Frame Details →
            </Button>
          </div>
        )}
      </div>

      {/* Index Suggestion Summary Panel - Right on desktop, bottom on mobile */}
      {(recommendedIndex || isHighPower || isVeryHighPower) && (
        <div className="lg:w-80 lg:sticky lg:top-6 lg:self-start mt-6 lg:mt-0">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Info className="text-blue-600" size={20} />
              <h3 className="text-lg font-bold text-slate-900">Index Recommendation</h3>
            </div>

            {recommendedIndex && (
              <div className="mb-4">
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-slate-600 mb-1">Recommended Index</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {indexService.getIndexDisplayName(recommendedIndex)}
                  </p>
                  <p className="text-xs text-slate-600 mt-2">
                    Based on your prescription power
                  </p>
                </div>
              </div>
            )}

            {/* Power Warnings */}
            {isVeryHighPower && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-xs font-semibold text-amber-900 mb-1">Very High Power</p>
                    <p className="text-xs text-amber-800">
                      Your power ({maxPower.toFixed(2)}D) is very high. Higher index lenses (1.67 or 1.74) are recommended for thinner, lighter lenses.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isHighPower && !isVeryHighPower && (
              <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 mb-3">
                <div className="flex items-start gap-2">
                  <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-xs font-semibold text-blue-900 mb-1">Moderate Power</p>
                    <p className="text-xs text-blue-800">
                      Consider 1.60 or 1.67 index for better lens thickness and weight.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info about index */}
            <div className="text-xs text-slate-600 space-y-1">
              <p><strong>What is Index?</strong></p>
              <p>Higher index = Thinner, lighter lenses. Recommended based on your prescription power.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

