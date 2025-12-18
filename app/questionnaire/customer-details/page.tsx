'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { User, ArrowRight, ArrowLeft } from 'lucide-react';
import { useSessionStore } from '@/stores/session-store';

export default function CustomerDetailsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const storeId = useSessionStore((state) => state.storeId);
  const storeCode = useSessionStore((state) => state.storeCode);
  const setStore = useSessionStore((state) => state.setStore);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [errors, setErrors] = useState<{
    name?: string;
    phone?: string;
    email?: string;
  }>({});
  const [verifyingStore, setVerifyingStore] = useState(false);

  // Check store verification on mount
  useEffect(() => {
    const checkStore = async () => {
      // If store is not verified, try to verify from localStorage
      if (!storeId || !storeCode) {
        const savedCode = localStorage.getItem('lenstrack_store_code');
        if (savedCode) {
          setVerifyingStore(true);
          try {
            const response = await fetch(`/api/public/verify-store?code=${savedCode}`);
            const data = await response.json();
            if (data.success) {
              setStore(data.data.id, data.data.code, data.data.name);
            } else {
              // Store code invalid, redirect to questionnaire page
              showToast('error', 'Please verify store code first');
              router.push('/questionnaire');
              return;
            }
          } catch (error) {
            showToast('error', 'Failed to verify store');
            router.push('/questionnaire');
            return;
          } finally {
            setVerifyingStore(false);
          }
        } else {
          // No store code found, redirect to questionnaire
          showToast('error', 'Please select a store first');
          router.push('/questionnaire');
          return;
        }
      }
    };

    checkStore();
  }, [storeId, storeCode, router, setStore, showToast]);

  useEffect(() => {
    // Load saved data from localStorage (only if store is verified)
    if (storeId) {
      const saved = localStorage.getItem('lenstrack_customer_details');
      if (saved) {
      try {
        const data = JSON.parse(saved);
        setCustomerName(data.name || '');
        setCustomerPhone(data.phone || '');
        setCustomerEmail(data.email || '');
      } catch (error) {
        console.error('Failed to parse saved customer details:', error);
      }
      }
    }
  }, [storeId]);

  // Validation functions
  const validatePhone = (phone: string): boolean => {
    // Indian phone number: 10 digits, optionally with +91 or 0 prefix
    const phoneRegex = /^(\+91|0)?[6-9]\d{9}$/;
    const cleaned = phone.replace(/[\s-]/g, '');
    return phoneRegex.test(cleaned);
  };

  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleNext = () => {
    // Reset errors
    const newErrors: { name?: string; phone?: string; email?: string } = {};

    // Validate name (required)
    if (!customerName.trim()) {
      newErrors.name = 'Customer name is required';
    } else if (customerName.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Validate phone (required)
    if (!customerPhone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(customerPhone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    // Validate email (optional but must be valid if provided)
    if (customerEmail.trim() && !validateEmail(customerEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // If there are errors, show them and stop
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Show first error as toast
      const firstError = Object.values(newErrors)[0];
      if (firstError) {
        showToast('error', firstError);
      }
      return;
    }

    // Clear errors
    setErrors({});

    // Save to localStorage (without category - will be selected at offer summary)
    const data = {
      name: customerName.trim(),
      phone: customerPhone.trim(),
      email: customerEmail.trim() || undefined,
    };
    localStorage.setItem('lenstrack_customer_details', JSON.stringify(data));
    
    // Navigate to mode selection (after customer details)
    router.push('/questionnaire/mode-selection');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only digits, +, spaces, and hyphens
    const cleaned = value.replace(/[^\d+\s-]/g, '');
    setCustomerPhone(cleaned);
    // Clear error when user starts typing
    if (errors.phone) {
      setErrors({ ...errors, phone: undefined });
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerEmail(e.target.value);
    // Clear error when user starts typing
    if (errors.email) {
      setErrors({ ...errors, email: undefined });
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerName(e.target.value);
    // Clear error when user starts typing
    if (errors.name) {
      setErrors({ ...errors, name: undefined });
    }
  };

  // Show loading if verifying store
  if (verifyingStore || !storeId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-slate-400">Verifying store...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl w-full">
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur rounded-2xl p-4 sm:p-6 lg:p-8 border border-slate-200 dark:border-slate-700 shadow-lg dark:shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <User className="text-white dark:text-white sm:w-8 sm:h-8" size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-1">Customer Details</h1>
              <p className="text-slate-600 dark:text-slate-400">Enter customer information</p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Enter customer name"
                value={customerName}
                onChange={handleNameChange}
                className={errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
              />
              {errors.name && (
                <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <Input
                  type="tel"
                  placeholder="9876543210 or +91-9876543210"
                  value={customerPhone}
                  onChange={handlePhoneChange}
                  maxLength={15}
                  className={errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                />
                {errors.phone && (
                  <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.phone}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Email Address <span className="text-slate-500 dark:text-slate-400 text-xs">(Optional)</span>
                </label>
                <Input
                  type="email"
                  placeholder="customer@example.com"
                  value={customerEmail}
                  onChange={handleEmailChange}
                  className={errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="outline"
              onClick={() => router.push('/questionnaire')}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!customerName.trim() || !customerPhone.trim()}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Mode Selection
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

