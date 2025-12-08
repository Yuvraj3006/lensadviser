'use client';

import { Check } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface Step {
  number: number;
  label: string;
  icon: LucideIcon;
}

interface StepHeaderProps {
  steps: Step[];
  currentStep: number;
}

export function StepHeader({ steps, currentStep }: StepHeaderProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;
          const isUpcoming = step.number > currentStep;

          return (
            <div key={step.number} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    isActive
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : isCompleted
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-white border-slate-300 text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check size={20} />
                  ) : (
                    <Icon size={20} />
                  )}
                </div>
                <span
                  className={`mt-2 text-sm font-medium ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    isCompleted ? 'bg-green-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

