'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Store, QrCode } from 'lucide-react';
import { useSessionStore } from '@/stores/session-store';
import { QRScanner } from '@/components/questionnaire/QRScanner';

export default function QuestionnairePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const setStore = useSessionStore((state) => state.setStore);
  const [storeCode, setStoreCode] = useState('');
  const [storeVerified, setStoreVerified] = useState(false);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);


  useEffect(() => {
    // Check for secret key in URL
    const params = new URLSearchParams(window.location.search);
    const secretKey = params.get('key');
    const codeFromUrl = params.get('code');
    
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

    // Check for store code from QR code URL
    if (codeFromUrl) {
      setStoreCode(codeFromUrl.toUpperCase());
      verifyStore(codeFromUrl.toUpperCase(), true); // Auto-redirect to customer details
      // Clean URL after processing
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

  const verifyStore = async (code: string, autoRedirect: boolean = false) => {
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
        
        // Auto-redirect to customer details page if QR scan or URL code
        if (autoRedirect) {
          router.push('/questionnaire/customer-details');
        }
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
    // Navigate directly to customer details page
    router.push('/questionnaire/customer-details');
  };

  const handleQRScan = async (scannedCode: string) => {
    setShowQRScanner(false);
    setStoreCode(scannedCode);
    // Auto-verify the scanned store code and redirect to customer details
    await verifyStore(scannedCode, true);
  };

  return (
    <div className="min-h-safe-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-4xl shadow-lg shadow-blue-500/30 mx-auto mb-4">
            👓
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2">LensTrack</h1>
          <p className="text-slate-600 dark:text-slate-400">Find Your Perfect Eyewear</p>
        </div>

        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-lg dark:shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Store className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Enter Store Code</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Provided by your optician</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Input
                label="Store Code"
                placeholder="e.g., MAIN-001"
                value={storeCode}
                onChange={(e) => setStoreCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && !storeVerified && handleVerifyStore()}
                disabled={storeVerified}
              />
              {!storeVerified && (
                <button
                  type="button"
                  onClick={() => setShowQRScanner(true)}
                  className="absolute right-3 top-9 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Scan QR Code"
                >
                  <QrCode size={20} className="text-slate-600 dark:text-slate-400" />
                </button>
              )}
            </div>

            {!storeVerified && (
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={() => setShowQRScanner(true)}
                className="flex items-center justify-center gap-2"
              >
                <QrCode size={18} />
                Scan QR Code
              </Button>
            )}

            {storeVerified ? (
              <>
                {storeInfo && (
                  <div className="text-center py-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">
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
                      className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 mt-2"
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

            <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-500">
                Don't have a store code? Ask your optician or visit your nearest LensTrack store.
              </p>
            </div>
          </div>
        </div>

        {/* Staff Login Link */}
        <div className="text-center mt-8">
          <Link
            href="/login"
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
          >
            🔐 Staff Login
          </Link>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </div>
  );
}

