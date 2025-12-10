'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { useLensAdvisorStore } from '@/stores/lens-advisor-store';
import { useSessionStore } from '@/stores/session-store';
import { FrameEntryForm } from '@/components/lens-advisor/FrameEntryForm';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';

// Helper function to get user-friendly status messages
function getStatusMessage(status: number): string {
  const statusMessages: Record<number, string> = {
    400: 'Invalid request. Please check your input and try again.',
    401: 'Authentication required. Please login.',
    403: 'Access denied. You do not have permission.',
    404: 'Resource not found. Please check the URL.',
    409: 'Conflict. This resource already exists.',
    422: 'Validation error. Please check your input.',
    500: 'Internal server error. Please try again later.',
    502: 'Bad gateway. Server is temporarily unavailable.',
    503: 'Service unavailable. Database connection issue. Please check your connection.',
    504: 'Gateway timeout. Server took too long to respond.',
  };
  return statusMessages[status] || `Server error (${status}). Please try again.`;
}

export default function FramePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const frame = useLensAdvisorStore((state) => state.frame);
  const setFrame = useLensAdvisorStore((state) => state.setFrame);
  const storeCode = useSessionStore((state) => state.storeCode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lensType, setLensType] = useState<string | null>(null);

  useEffect(() => {
    // Load saved frame data from localStorage
    const saved = localStorage.getItem('lenstrack_frame');
    if (saved) {
      try {
        const frameData = JSON.parse(saved);
        setFrame(frameData);
      } catch (error) {
        console.error('Failed to parse saved frame data:', error);
      }
    }
    
    // Check lens type to determine if frame entry is required
    const savedLensType = localStorage.getItem('lenstrack_lens_type') || localStorage.getItem('lenstrack_category');
    setLensType(savedLensType);
    
    // If "Only Lens" is selected, skip frame entry and go directly to questionnaire
    if (savedLensType === 'ONLY_LENS') {
      handleSkipFrame();
    }
  }, [setFrame]);

  // Debug: Log frame state changes
  useEffect(() => {
    console.log('[FramePage] Frame state updated:', frame);
    console.log('[FramePage] Frame type check:', {
      frameType: frame?.frameType,
      hasFrameType: !!frame?.frameType,
      frameTypeValue: frame?.frameType,
      frameTypeType: typeof frame?.frameType,
    });
  }, [frame]);

  // Handle skipping frame entry for "Only Lens" flow
  const handleSkipFrame = async () => {
    const savedLensType = localStorage.getItem('lenstrack_lens_type') || localStorage.getItem('lenstrack_category');
    
    // Only skip if "Only Lens" is selected
    if (savedLensType !== 'ONLY_LENS') {
      return; // Don't skip for other categories
    }
    
    setIsSubmitting(true);
    
    try {
      // Get all collected data
      const customerDetails = JSON.parse(localStorage.getItem('lenstrack_customer_details') || '{}');
      const prescription = JSON.parse(localStorage.getItem('lenstrack_prescription') || '{}');
      const currentStoreCode = storeCode;

      // Create session without frame data
      // Map ONLY_LENS to EYEGLASSES for backend compatibility (backend uses EYEGLASSES category)
      const response = await fetch('/api/public/questionnaire/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeCode: currentStoreCode || 'MAIN-001',
          category: 'EYEGLASSES', // Backend uses EYEGLASSES, we'll track ONLY_LENS separately
          customerName: customerDetails?.name || undefined,
          customerPhone: customerDetails?.phone || undefined,
          customerEmail: customerDetails?.email || undefined,
          customerCategory: customerDetails?.category || undefined,
          prescription: (prescription && Object.keys(prescription).length > 0) ? prescription : undefined,
          // No frame data for "Only Lens" flow
        }),
      });

      const data = await response.json();
      
      if (data.success && data.data?.sessionId) {
        // Store that this is an "Only Lens" session
        localStorage.setItem(`lenstrack_session_${data.data.sessionId}_only_lens`, 'true');
        router.push(`/questionnaire/${data.data.sessionId}`);
      } else {
        showToast('error', data.error?.message || 'Failed to create session');
      }
    } catch (error) {
      console.error('[FramePage] Error skipping frame:', error);
      showToast('error', 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    console.log('[FramePage] handleNext called, frame:', frame);
    
    // Check if "Only Lens" is selected - skip frame validation
    const savedLensType = localStorage.getItem('lenstrack_lens_type') || localStorage.getItem('lenstrack_category');
    if (savedLensType === 'ONLY_LENS') {
      // Skip frame entry for "Only Lens" flow
      await handleSkipFrame();
      return;
    }
    
    // Validate required fields for other flows
    if (!frame?.brand || !frame?.brand.trim()) {
      showToast('error', 'Please select a frame brand');
      return;
    }
    
    if (!frame?.mrp || frame.mrp <= 0) {
      showToast('error', 'Please enter a valid frame price');
      return;
    }
    
    // Check frameType - allow empty string check too
    const frameType = frame?.frameType;
    if (!frameType || frameType.trim() === '') {
      console.error('[FramePage] Frame type validation failed:', {
        frameType,
        frameTypeType: typeof frameType,
        frame: frame,
      });
      showToast('error', 'Please select a frame type');
      return;
    }

    setIsSubmitting(true);

    try {
      // Save frame data
      localStorage.setItem('lenstrack_frame', JSON.stringify(frame));

      // Get all collected data
      const customerDetails = JSON.parse(localStorage.getItem('lenstrack_customer_details') || '{}');
      const lensType = localStorage.getItem('lenstrack_lens_type') || localStorage.getItem('lenstrack_category') || 'EYEGLASSES';
      const prescription = JSON.parse(localStorage.getItem('lenstrack_prescription') || '{}');

      console.log('[FramePage] Lens type check:', {
        lensType,
        lensTypeFromStorage: localStorage.getItem('lenstrack_lens_type'),
        categoryFromStorage: localStorage.getItem('lenstrack_category'),
        allStorageKeys: Object.keys(localStorage).filter(k => k.includes('lens') || k.includes('category')),
      });

      // Validate required data - use default if not found
      const finalLensType = lensType || 'EYEGLASSES';
      if (!finalLensType || finalLensType.trim() === '') {
        console.error('[FramePage] Lens type validation failed:', {
          lensType,
          finalLensType,
          allLocalStorage: Object.keys(localStorage).map(k => ({ key: k, value: localStorage.getItem(k) })),
        });
        showToast('error', 'Lens type is required. Please go back and select a lens type.');
        setIsSubmitting(false);
        return;
      }

      if (!storeCode || storeCode.trim() === '') {
        showToast('error', 'Store code is required. Please go back to the start page and verify your store code.');
        setIsSubmitting(false);
        return;
      }

      // Validate and clean frame data
      const cleanedFrame = frame ? {
        brand: frame.brand || '',
        subCategory: frame.subCategory || null,
        mrp: frame.mrp || 0,
        frameType: frame.frameType || undefined,
      } : null;

      console.log('[FramePage] Creating session with:', {
        storeCode,
        category: finalLensType,
        lensType: finalLensType,
        frame: cleanedFrame,
        customerDetails,
        prescription: prescription && Object.keys(prescription).length > 0 ? prescription : null,
      });

      // Check for secret key (development mode)
      const params = new URLSearchParams(window.location.search);
      const secretKey = params.get('key');
      
      if (secretKey === 'LENSTRACK2025') {
        // Mock session for development
        const mockSessionId = `mock-session-${Date.now()}`;
        router.push(`/questionnaire/${mockSessionId}`);
        return;
      }

      const response = await fetch('/api/public/questionnaire/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeCode: storeCode || 'MAIN-001',
          category: finalLensType,
          customerName: customerDetails?.name || undefined,
          customerPhone: customerDetails?.phone || undefined,
          customerEmail: customerDetails?.email || undefined,
          customerCategory: customerDetails?.category || undefined,
          prescription: (prescription && Object.keys(prescription).length > 0) ? prescription : undefined,
          frame: cleanedFrame || undefined,
        }),
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      let data: any;
      
      try {
        if (contentType && contentType.includes('application/json')) {
          // Read response as text first for debugging, then parse
          const rawText = await response.text();
          
          // Log raw response prominently
          console.group('🔍 [FramePage] Raw API Response');
          console.log('Status:', response.status, response.statusText);
          console.log('Content-Type:', contentType);
          console.log('Raw Text (first 1000 chars):', rawText.substring(0, 1000));
          console.log('Is Empty:', !rawText || rawText.trim() === '');
          console.log('Full Length:', rawText.length);
          console.log('Starts with {:', rawText.trim().startsWith('{'));
          console.log('Starts with <:', rawText.trim().startsWith('<'));
          console.groupEnd();
          
          // Check if response is HTML (Next.js error page)
          if (rawText.trim().startsWith('<!') || rawText.trim().startsWith('<html')) {
            console.error('[FramePage] Server returned HTML error page instead of JSON');
            showToast('error', `Server error (${response.status}): The server returned an error page. Check server logs for details.`);
            return;
          }
          
          if (!rawText || rawText.trim() === '') {
            console.error('[FramePage] Empty JSON response body');
            showToast('error', `Server returned empty response: ${response.status}`);
            return;
          }
          
          try {
            data = JSON.parse(rawText);
          } catch (jsonError) {
            console.error('[FramePage] JSON parse error:', jsonError, 'Raw text:', rawText);
            showToast('error', `Invalid JSON response from server: ${response.status}`);
            return;
          }
        } else {
          const text = await response.text();
          console.error('[FramePage] Non-JSON response:', {
            status: response.status,
            statusText: response.statusText,
            contentType,
            body: text.substring(0, 500),
          });
          showToast('error', `Server error: ${response.status} ${response.statusText}`);
          return;
        }
      } catch (parseError) {
        console.error('[FramePage] Failed to read response:', parseError);
        showToast('error', `Failed to read server response: ${response.status}`);
        return;
      }

      console.log('[FramePage] Session creation response:', {
        status: response.status,
        ok: response.ok,
        data,
      });

      // Handle non-OK responses
      if (!response.ok) {
        // Default error message based on status
        let errorMessage = getStatusMessage(response.status);
        
        // Try to extract error message from various formats
        if (data) {
          // Check if error exists and has content
          if (data.error !== undefined && data.error !== null) {
            if (typeof data.error === 'string' && data.error.trim()) {
              errorMessage = data.error;
            } else if (typeof data.error === 'object') {
              if (data.error.message && typeof data.error.message === 'string') {
                errorMessage = data.error.message;
              } else if (data.error.code && typeof data.error.code === 'string') {
                errorMessage = `Error: ${data.error.code}`;
              } else {
                const errorKeys = Object.keys(data.error);
                if (errorKeys.length > 0) {
                  // Try to find any string value in the error object
                  const stringValue = Object.values(data.error).find(v => typeof v === 'string' && v.trim());
                  if (stringValue) {
                    errorMessage = String(stringValue);
                  } else {
                    errorMessage = `Error: ${errorKeys.join(', ')}`;
                  }
                } else {
                  // Empty error object - use status-based message
                  errorMessage = getStatusMessage(response.status);
                }
              }
            }
          } else if (data.message && typeof data.message === 'string') {
            errorMessage = data.message;
          } else if (typeof data === 'string' && data.trim()) {
            errorMessage = data;
          } else if (data.success === false) {
            // API returned success: false but no error object - use status message
            errorMessage = getStatusMessage(response.status);
          }
        }
        
        // Log comprehensive error details for debugging
        console.group('❌ [FramePage] Session Creation Failed');
        console.error('HTTP Status:', response.status, response.statusText);
        console.error('Error Object:', data?.error);
        console.error('Error Type:', typeof data?.error);
        console.error('Is Empty Object:', data?.error && typeof data.error === 'object' && Object.keys(data.error).length === 0);
        console.error('Full Response:', data);
        console.error('Response Keys:', data ? Object.keys(data) : []);
        console.error('Error Keys:', data?.error && typeof data.error === 'object' ? Object.keys(data.error) : []);
        console.error('Extracted Message:', errorMessage);
        console.error('Raw Response Stringified:', JSON.stringify(data, null, 2));
        
        // If error message is still the default, try to get more info
        if (errorMessage === getStatusMessage(response.status) && data) {
          // Try to extract any useful information from the response
          const responseStr = JSON.stringify(data);
          if (responseStr.length > 0 && responseStr !== '{}') {
            console.warn('[FramePage] Response contains data but error object is empty:', responseStr.substring(0, 200));
          }
        }
        
        console.groupEnd();
        
        // Always show error message - ensure it's not empty
        const finalErrorMessage = errorMessage || `Server error (${response.status}). Please check your connection and try again.`;
        showToast('error', finalErrorMessage);
        return;
      }

      // Handle successful HTTP response but API-level error
      if (data.success && data.data?.sessionId) {
        const sessionId = data.data.sessionId;
        localStorage.setItem('lenstrack_session_id', sessionId);
        
        // Check if Power Sunglasses - tint color selection is mandatory after prescription
        const savedLensType = localStorage.getItem('lenstrack_lens_type');
        const isPowerSunglasses = savedLensType === 'SUNGLASSES';
        
        if (isPowerSunglasses) {
          // Check if tint selection has already been done
          const tintSelection = localStorage.getItem(`lenstrack_tint_selection_${sessionId}`);
          if (!tintSelection) {
            // Redirect to tint color selection (mandatory step for Power Sunglasses)
            router.push(`/questionnaire/${sessionId}/tint-color-selection`);
            return;
          }
        }
        
        // Continue to questionnaire
        router.push(`/questionnaire/${sessionId}`);
      } else {
        // Handle various error formats
        let errorMessage = 'Failed to start questionnaire';
        
        if (data?.error) {
          if (typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (data.error.message) {
            errorMessage = data.error.message;
          } else if (data.error.code) {
            errorMessage = `Error: ${data.error.code}`;
          } else if (typeof data.error === 'object') {
            const errorKeys = Object.keys(data.error);
            if (errorKeys.length > 0) {
              errorMessage = `Error: ${errorKeys.join(', ')}`;
            }
          }
        } else if (data?.message) {
          errorMessage = data.message;
        }
        
        console.error('[FramePage] Session creation failed (API error):', {
          error: data?.error,
          fullResponse: data,
          responseStatus: response.status,
          errorType: typeof data?.error,
          errorKeys: data?.error ? Object.keys(data.error) : [],
        });
        showToast('error', errorMessage);
      }
    } catch (error) {
      console.error('[FramePage] Error creating session:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while starting questionnaire';
      showToast('error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show message if "Only Lens" is selected
  if (lensType === 'ONLY_LENS') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700 shadow-2xl">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Only Lens Selected</h2>
              <p className="text-slate-300 mb-6">Frame entry is not required for lens-only purchases.</p>
              <p className="text-slate-400 mb-8">Proceeding to questionnaire...</p>
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              ) : (
                <Button
                  onClick={handleSkipFrame}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  Continue to Questionnaire →
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700 shadow-2xl">
          {/* Use existing FrameEntryForm component - hide its navigation */}
          <div className="bg-white rounded-xl p-6">
            <FrameEntryForm hideNextButton={true} />
          </div>

          {/* Custom Navigation */}
          <div className="flex justify-between mt-6 pt-6 border-t border-slate-700">
            <Button
              variant="outline"
              onClick={() => router.push('/questionnaire/prescription')}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={
                !frame?.brand || 
                !frame?.mrp || 
                frame.mrp <= 0 ||
                !frame?.frameType || 
                frame.frameType.trim() === '' ||
                isSubmitting
              }
              loading={isSubmitting}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              Next: Your Lifestyle →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
