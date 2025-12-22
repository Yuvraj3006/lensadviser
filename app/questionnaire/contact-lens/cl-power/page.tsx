'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Contact, CheckCircle } from 'lucide-react';
import { useLensAdvisorStore } from '@/stores/lens-advisor-store';

export default function CLPowerPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const rx = useLensAdvisorStore((state) => state.rx);
  const setRx = useLensAdvisorStore((state) => state.setRx);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Verify method selection
    const method = localStorage.getItem('lenstrack_cl_power_method');
    if (method !== 'CONTACT_LENS') {
      router.push('/questionnaire/contact-lens/power-input-method');
      return;
    }

    // Load saved CL power if exists
    const saved = localStorage.getItem('lenstrack_cl_final_power');
    if (saved) {
      const powerData = JSON.parse(saved);
      // Set Rx from saved CL power
      setRx({
        odSphere: powerData.od?.sphere ?? undefined,
        odCylinder: powerData.od?.cylinder ?? undefined,
        odAxis: powerData.od?.axis ?? undefined,
        odAdd: powerData.od?.add ?? undefined,
        osSphere: powerData.os?.sphere ?? undefined,
        osCylinder: powerData.os?.cylinder ?? undefined,
        osAxis: powerData.os?.axis ?? undefined,
        osAdd: powerData.os?.add ?? undefined,
      });
    }
  }, [setRx, router]);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Real-time validation - runs automatically when rx values change
  useEffect(() => {
    validateInput();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rx.odSphere, rx.odCylinder, rx.odAxis, rx.odAdd, rx.osSphere, rx.osCylinder, rx.osAxis, rx.osAdd]);

  // Real-time validation
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

  const handleConfirm = () => {
    // Validate prescription
    if (!validateInput()) {
      if (validationErrors.length > 0) {
        showToast('error', validationErrors[0]);
      }
      return;
    }

    // Save CL power directly (no conversion)
    const clPower = {
      od: {
        sphere: rx.odSphere ?? null,
        cylinder: rx.odCylinder ?? null,
        axis: rx.odAxis ?? null,
        add: rx.odAdd ?? null,
      },
      os: {
        sphere: rx.osSphere ?? null,
        cylinder: rx.osCylinder ?? null,
        axis: rx.osAxis ?? null,
        add: rx.osAdd ?? null,
      },
    };

    localStorage.setItem('lenstrack_cl_final_power', JSON.stringify(clPower));
    router.push('/questionnaire/contact-lens/questionnaire');
  };

  return (
    <div className="min-h-safe-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 sm:p-6 lg:p-8 border border-slate-700 shadow-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-2 sm:gap-3">
            <Contact size={24} className="sm:w-8 sm:h-8" />
            Enter Your Contact Lens Power
          </h1>
          <p className="text-slate-300 mb-6">Enter your contact lens prescription directly</p>

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
                  <label className="block text-sm font-medium text-slate-700 mb-2">ADD (if MF)</label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">ADD (if MF)</label>
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
              disabled={(!rx.odSphere && !rx.osSphere) || validationErrors.length > 0}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 disabled:opacity-50"
            >
              <CheckCircle size={20} />
              Confirm Power
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

