'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Eye, EyeOff, Glasses } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      showToast('success', 'Login successful!');
      router.push('/admin');
    } catch (error: any) {
      showToast('error', error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Glasses className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">LensTrack</h1>
              <p className="text-sm text-slate-600">Optical Store Management</p>
            </div>
          </div>

          {/* Login Form */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Welcome Back</h2>
            <p className="text-sm text-slate-600">
              Sign in to access your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              type="email"
              label="Email Address"
              placeholder="admin@lenstrack.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <Button type="submit" fullWidth loading={loading}>
              Sign In
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs font-semibold text-blue-900 mb-2">
              Demo Credentials:
            </p>
            <div className="text-xs text-blue-800 space-y-1">
              <p>Super Admin: superadmin@lenstrack.com / admin123</p>
              <p>Admin: admin@lenstrack.com / admin123</p>
              <p>Manager: manager@lenstrack.com / admin123</p>
              <p>Sales: sales@lenstrack.com / admin123</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Branding */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 via-purple-600 to-purple-700 p-12 items-center justify-center">
        <div className="max-w-lg text-white">
          <h2 className="text-4xl font-bold mb-6">
            Intelligent Product Recommendations
          </h2>
          <p className="text-lg mb-8 text-blue-100">
            Streamline your optical store operations with AI-powered questionnaires
            and smart product recommendations.
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                ✓
              </div>
              <div>
                <h3 className="font-semibold mb-1">5-Minute Customer Journey</h3>
                <p className="text-sm text-blue-100">
                  Complete assessment and recommendations in under 5 minutes
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                ✓
              </div>
              <div>
                <h3 className="font-semibold mb-1">Multi-Store Management</h3>
                <p className="text-sm text-blue-100">
                  Manage multiple stores with role-based access control
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                ✓
              </div>
              <div>
                <h3 className="font-semibold mb-1">Comprehensive Analytics</h3>
                <p className="text-sm text-blue-100">
                  Track performance, conversion rates, and customer insights
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

