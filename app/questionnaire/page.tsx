'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Store } from 'lucide-react';
import { useSessionStore } from '@/stores/session-store';

export default function QuestionnairePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const setStore = useSessionStore((state) => state.setStore);
  const [storeCode, setStoreCode] = useState('');
  const [storeVerified, setStoreVerified] = useState(false);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);


  useEffect(() => {
    // Check for secret key in URL
    const params = new URLSearchParams(window.location.search);
    const secretKey = params.get('key');
    
    // Secret key check - bypass DB for development
    if (secretKey === 'LENSTRACK2025') {
      // Auto-verify with mock store data (bypasses DB)
      const mockStoreInfo = {
        id: 'mock-store-id',
        code: 'MAIN-001',
        name: 'Main Store - Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        organizationId: 'mock-org-id',
      };
      setStoreCode('MAIN-001');
      setStoreVerified(true);
      setStoreInfo(mockStoreInfo);
      localStorage.setItem('lenstrack_store_code', 'MAIN-001');
      // Set session store
      setStore(mockStoreInfo.id, mockStoreInfo.code, mockStoreInfo.name);
      // Clean URL
      window.history.replaceState({}, '', '/questionnaire');
      return;
    }

    // Check if store code is saved
    const savedCode = localStorage.getItem('lenstrack_store_code');
    if (savedCode) {
      setStoreCode(savedCode);
      verifyStore(savedCode);
    }
  }, []);

  const verifyStore = async (code: string) => {
    setVerifying(true);
    try {
      const response = await fetch(`/api/public/verify-store?code=${code}`);
      const data = await response.json();

      if (data.success) {
        setStoreVerified(true);
        setStoreInfo(data.data);
        localStorage.setItem('lenstrack_store_code', code);
        // Set session store
        setStore(data.data.id, data.data.code, data.data.name);
      } else {
        showToast('error', 'Invalid store code');
        setStoreVerified(false);
        localStorage.removeItem('lenstrack_store_code');
      }
    } catch (error) {
      showToast('error', 'Failed to verify store code');
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyStore = () => {
    if (!storeCode.trim()) {
      showToast('error', 'Please enter store code');
      return;
    }
    verifyStore(storeCode);
  };

  const handleStart = () => {
    // Navigate to mode selection first (as per spec: Store → Mode → Language → Mode Selection)
    router.push('/questionnaire/mode-selection');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-4xl shadow-lg shadow-blue-500/30 mx-auto mb-4">
            👓
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-2">LensTrack</h1>
          <p className="text-slate-400">Find Your Perfect Eyewear</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Store className="text-blue-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Enter Store Code</h2>
              <p className="text-sm text-slate-400">Provided by your optician</p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Store Code"
              placeholder="e.g., MAIN-001"
              value={storeCode}
              onChange={(e) => setStoreCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && !storeVerified && handleVerifyStore()}
              disabled={storeVerified}
            />

            {storeVerified ? (
              <>
                {storeInfo && (
                  <div className="text-center py-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-sm text-green-400 font-medium">
                      ✓ {storeInfo.name} • {storeInfo.city}
                    </p>
                    <button
                      onClick={() => {
                        localStorage.removeItem('lenstrack_store_code');
                        setStoreVerified(false);
                        setStoreInfo(null);
                        // Reset session store
                        useSessionStore.getState().reset();
                      }}
                      className="text-xs text-slate-400 hover:text-slate-300 mt-2"
                    >
                      Change Store
                    </button>
                  </div>
                )}
                <Button
                  fullWidth
                  size="lg"
                  onClick={handleStart}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  Start
                </Button>
              </>
            ) : (
              <Button
                fullWidth
                size="lg"
                onClick={handleVerifyStore}
                loading={verifying}
              >
                Verify Store
              </Button>
            )}

            <div className="text-center pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-500">
                Don't have a store code? Ask your optician or visit your nearest LensTrack store.
              </p>
            </div>
          </div>
        </div>

        {/* Staff Login Link */}
        <div className="text-center mt-8">
          <Link
            href="/login"
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            🔐 Staff Login
          </Link>
        </div>
      </div>
    </div>
  );
}

