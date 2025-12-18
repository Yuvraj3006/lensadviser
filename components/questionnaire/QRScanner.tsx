'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface QRScannerProps {
  onScan: (storeCode: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current = null;
          })
          .catch(() => {
            scannerRef.current = null;
          });
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setError(null);
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // QR code scanned successfully
          handleQRCode(decodedText);
        },
        (errorMessage) => {
          // Ignore scanning errors (they're frequent during scanning)
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('QR Scanner Error:', err);
      setError(err.message || 'Failed to start camera. Please check permissions.');
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  const handleQRCode = (decodedText: string) => {
    // Stop scanning
    stopScanning();

    // Extract store code from QR code
    // QR code format: Can be just store code or URL with store code
    let storeCode = decodedText.trim();

    // If QR contains URL, extract store code from query params
    try {
      const url = new URL(decodedText);
      const codeFromUrl = url.searchParams.get('code') || url.searchParams.get('store');
      if (codeFromUrl) {
        storeCode = codeFromUrl;
      }
    } catch {
      // Not a URL, use as-is
    }

    // Call onScan with the store code
    onScan(storeCode.toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 dark:bg-black/90 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <QrCode size={24} />
            Scan Store QR Code
          </h2>
          <button
            onClick={() => {
              stopScanning();
              onClose();
            }}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="mb-4">
          <div
            id="qr-reader"
            ref={containerRef}
            className="w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900"
            style={{ minHeight: '300px' }}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          {!isScanning ? (
            <Button
              onClick={startScanning}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Camera size={18} />
              Start Scanning
            </Button>
          ) : (
            <Button
              onClick={stopScanning}
              variant="outline"
              className="flex-1"
            >
              Stop Scanning
            </Button>
          )}
          <Button
            onClick={() => {
              stopScanning();
              onClose();
            }}
            variant="outline"
          >
            Cancel
          </Button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
          Point your camera at the store QR code
        </p>
      </div>
    </div>
  );
}

