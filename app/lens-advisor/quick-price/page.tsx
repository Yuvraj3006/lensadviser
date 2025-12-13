'use client';

/**
 * Quick Price Check Flow
 * Matches Frontend Specification - Fast flow for phone enquiries
 * 1. Rx Entry 2. Frame Entry 3. Vision Type Selection 4. Full price matrix only 5. Offer Breakdown directly
 */

import { useState } from 'react';
import { useLensAdvisorStore } from '@/stores/lens-advisor-store';
import { PrescriptionForm } from '@/components/lens-advisor/PrescriptionForm';
import { FrameEntryForm } from '@/components/lens-advisor/FrameEntryForm';
import { PriceMatrixModal } from '@/components/lens-advisor/PriceMatrixModal';
import { OfferCalculatorView } from '@/components/lens-advisor/OfferCalculatorView';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Eye, Frame, List, Calculator } from 'lucide-react';

type QuickPriceStep = 'rx' | 'frame' | 'vision' | 'matrix' | 'offer';

export default function QuickPricePage() {
  const [currentStep, setCurrentStep] = useState<QuickPriceStep>('rx');
  const [showPriceMatrix, setShowPriceMatrix] = useState(false);
  const rx = useLensAdvisorStore((state) => state.rx);
  const frame = useLensAdvisorStore((state) => state.frame);
  const setSelectedLens = useLensAdvisorStore((state) => state.setSelectedLens);

  const handleSelectFromMatrix = (lens: any) => {
    setSelectedLens({
      id: lens.itCode,
      itCode: lens.itCode,
      name: lens.name,
      brandLine: 'STANDARD',
      price: lens.price,
      yopoEligible: false,
    });
    setCurrentStep('offer');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Quick Price Check</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Fast flow for phone enquiries</p>
        </div>

        {/* Step Indicator */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            {[
              { key: 'rx', label: '1. Rx Entry', icon: Eye },
              { key: 'frame', label: '2. Frame Entry', icon: Frame },
              { key: 'vision', label: '3. Vision Type', icon: Eye },
              { key: 'matrix', label: '4. Price Matrix', icon: List },
              { key: 'offer', label: '5. Offer', icon: Calculator },
            ].map((step, idx) => {
              const Icon = step.icon;
              const isActive = currentStep === step.key;
              const isCompleted = ['rx', 'frame', 'vision', 'matrix', 'offer'].indexOf(currentStep) > idx;

              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    <span className={`mt-1 text-xs ${isActive ? 'text-blue-600 font-medium' : 'text-slate-400'}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < 4 && <div className="flex-1 h-0.5 mx-2 bg-slate-200" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {currentStep === 'rx' && (
            <div>
              <PrescriptionForm hideNextButton />
              <div className="flex justify-end mt-4">
                <Button onClick={() => setCurrentStep('frame')} size="lg">
                  Next: Frame Entry →
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'frame' && (
            <div>
              <FrameEntryForm />
              <div className="flex justify-between mt-4">
                <Button variant="outline" onClick={() => setCurrentStep('rx')}>
                  ← Back
                </Button>
                <Button onClick={() => setCurrentStep('vision')} size="lg">
                  Next: Vision Type →
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'vision' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Eye className="text-blue-600" size={28} />
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Vision Type Selection</h2>
                  <p className="text-slate-600">Select vision type for pricing</p>
                </div>
              </div>

              <Select
                label="Vision Type"
                value={rx.visionType || ''}
                onChange={(e) => {
                  const setRx = useLensAdvisorStore.getState().setRx;
                  setRx({ ...rx, visionType: e.target.value as any });
                }}
                options={[
                  { value: '', label: 'Select...' },
                  { value: 'SINGLE_VISION', label: 'Single Vision' },
                  { value: 'BIFOCAL', label: 'Bifocal' },
                  { value: 'PROGRESSIVE', label: 'Progressive' },
                ]}
              />

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setCurrentStep('frame')}>
                  ← Back
                </Button>
                <Button
                  onClick={() => setShowPriceMatrix(true)}
                  size="lg"
                  disabled={!rx.visionType}
                >
                  View Price Matrix →
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'offer' && (
            <div>
              <OfferCalculatorView />
            </div>
          )}
        </div>

        {/* Price Matrix Modal */}
        <PriceMatrixModal
          isOpen={showPriceMatrix}
          onClose={() => setShowPriceMatrix(false)}
          onSelect={handleSelectFromMatrix}
          sph={rx.odSphere ?? rx.osSphere ?? undefined}
          cyl={rx.odCylinder ?? rx.osCylinder ?? undefined}
          add={rx.odAdd ?? rx.osAdd ?? undefined}
          visionType={rx.visionType ?? undefined}
        />
      </div>
    </div>
  );
}

