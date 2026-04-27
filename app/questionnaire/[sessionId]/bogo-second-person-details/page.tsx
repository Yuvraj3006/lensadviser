'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, User } from 'lucide-react';

/**
 * After BOGO “other person” child session is created: capture name, phone, then continue to questionnaire.
 */
export default function BogoSecondPersonDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const sessionId = params?.sessionId as string;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [odSph, setOdSph] = useState('');
  const [osSph, setOsSph] = useState('');
  const [odCyl, setOdCyl] = useState('0');
  const [osCyl, setOsCyl] = useState('0');
  const [saving, setSaving] = useState(false);

  const handleNext = async () => {
    if (!name.trim() || name.trim().length < 2) {
      showToast('error', 'Enter the other person’s name.');
      return;
    }
    if (phone.trim().length !== 10) {
      showToast('error', 'Enter a valid 10-digit mobile number for the other person.');
      return;
    }
    const sOk =
      (odSph.trim() !== '' && !Number.isNaN(parseFloat(odSph))) ||
      (osSph.trim() !== '' && !Number.isNaN(parseFloat(osSph)));
    if (!sOk) {
      showToast('error', 'Enter sphere (SPH) for at least one eye, or 0 for Plano.');
      return;
    }

    setSaving(true);
    try {
      const prescription = {
        odSphere: parseFloat(odSph) || 0,
        osSphere: parseFloat(osSph) || 0,
        odCylinder: parseFloat(odCyl) || 0,
        osCylinder: parseFloat(osCyl) || 0,
      };
      const r = await fetch(`/api/public/questionnaire/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: phone.trim(),
          mergeSessionNotes: { prescription },
        }),
      });
      const j = await r.json();
      if (!j.success) {
        showToast('error', j.error?.message || 'Failed to save details');
        return;
      }
      router.push(`/questionnaire/${sessionId}`);
    } catch (e) {
      showToast('error', 'Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-safe-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white/95 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-xl p-6 sm:p-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 flex items-center text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-200">
            <User size={22} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">2nd pair — other person</h1>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
          This pair is for someone other than the first customer. Enter their name, phone, and prescription, then
          you’ll continue with the usual questions and lens list.
        </p>
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="Phone (10 digits)"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            inputMode="numeric"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium pt-2">Prescription (SPH at least one eye)</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="R SPH" value={odSph} onChange={(e) => setOdSph(e.target.value)} />
            <Input label="L SPH" value={osSph} onChange={(e) => setOsSph(e.target.value)} />
            <Input label="R CYL" value={odCyl} onChange={(e) => setOdCyl(e.target.value)} />
            <Input label="L CYL" value={osCyl} onChange={(e) => setOsCyl(e.target.value)} />
          </div>
        </div>
        <Button
          className="w-full mt-8"
          onClick={() => void handleNext()}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Continue to questionnaire'}
        </Button>
      </div>
    </div>
  );
}
