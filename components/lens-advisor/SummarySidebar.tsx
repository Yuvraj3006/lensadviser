'use client';

import { useLensAdvisorStore } from '@/stores/lens-advisor-store';
import { Card } from '@/components/ui/Card';
import { Eye, Frame, FileText, Sparkles } from 'lucide-react';

export function SummarySidebar() {
  const rx = useLensAdvisorStore((state) => state.rx);
  const frame = useLensAdvisorStore((state) => state.frame);
  const answers = useLensAdvisorStore((state) => state.answers);
  const selectedLens = useLensAdvisorStore((state) => state.selectedLens);
  const offerResult = useLensAdvisorStore((state) => state.offerResult);

  return (
    <div className="space-y-4">
      {/* Prescription Summary */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Eye size={18} className="text-blue-600" />
          <h3 className="font-semibold text-slate-900">Prescription</h3>
        </div>
        {rx.odSphere !== undefined || rx.osSphere !== undefined ? (
          <div className="space-y-2 text-sm">
            {rx.odSphere !== undefined && (
              <div>
                <span className="text-slate-600">OD:</span>{' '}
                <span className="font-medium">
                  {rx.odSphere} {rx.odCylinder && `/${rx.odCylinder}`} {rx.odAxis && `x${rx.odAxis}`}
                </span>
              </div>
            )}
            {rx.osSphere !== undefined && (
              <div>
                <span className="text-slate-600">OS:</span>{' '}
                <span className="font-medium">
                  {rx.osSphere} {rx.osCylinder && `/${rx.osCylinder}`} {rx.osAxis && `x${rx.osAxis}`}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Not entered</p>
        )}
      </Card>

      {/* Frame Summary */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Frame size={18} className="text-blue-600" />
          <h3 className="font-semibold text-slate-900">Frame</h3>
        </div>
        {frame ? (
          <div className="space-y-1 text-sm">
            <div>
              <span className="text-slate-600">Brand:</span>{' '}
              <span className="font-medium">{frame.brand}</span>
            </div>
            {frame.subCategory && (
              <div>
                <span className="text-slate-600">Category:</span>{' '}
                <span className="font-medium">{frame.subCategory}</span>
              </div>
            )}
            <div>
              <span className="text-slate-600">MRP:</span>{' '}
              <span className="font-medium">₹{frame.mrp.toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Not entered</p>
        )}
      </Card>

      {/* Answers Summary */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <FileText size={18} className="text-blue-600" />
          <h3 className="font-semibold text-slate-900">Questionnaire</h3>
        </div>
        <p className="text-sm text-slate-600">
          {answers.length} {answers.length === 1 ? 'answer' : 'answers'} selected
        </p>
      </Card>

      {/* Selected Lens */}
      {selectedLens && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-blue-600" />
            <h3 className="font-semibold text-slate-900">Selected Lens</h3>
          </div>
          <div className="space-y-1 text-sm">
            <div className="font-medium">{selectedLens.name}</div>
            <div className="text-slate-600">IT Code: {selectedLens.itCode}</div>
            <div className="text-slate-600">Price: ₹{selectedLens.price.toLocaleString()}</div>
          </div>
        </Card>
      )}

      {/* Offer Result */}
      {offerResult && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-green-600" />
            <h3 className="font-semibold text-slate-900">Final Price</h3>
          </div>
          <div className="text-2xl font-bold text-green-600">
            ₹{offerResult.finalPayable.toLocaleString()}
          </div>
          <div className="text-sm text-slate-600 mt-1">
            Savings: ₹{(offerResult.baseTotal - offerResult.finalPayable).toLocaleString()}
          </div>
        </Card>
      )}
    </div>
  );
}

