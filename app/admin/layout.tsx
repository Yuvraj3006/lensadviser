'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { PageLoader } from '@/components/ui/Spinner';
import { Menu, X } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Initialize with a check - assume mobile initially for SSR safety
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Close sidebar when switching to desktop
      if (!mobile) {
        setSidebarOpen(false);
      }
    };
    
    // Check immediately on mount
    if (typeof window !== 'undefined') {
      checkMobile();
    }
    
    window.addEventListener('resize', checkMobile);
    // Also check on orientation change for tablets
    window.addEventListener('orientationchange', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isMobile={isMobile} />
      
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (process.env.NODE_ENV === 'development') {
              console.log('[Sidebar] Button clicked, current state:', sidebarOpen);
            }
            setSidebarOpen((prev) => {
              if (process.env.NODE_ENV === 'development') {
                console.log('[Sidebar] Toggling from', prev, 'to', !prev);
              }
              return !prev;
            });
          }}
          className="lg:hidden fixed top-4 left-4 z-[60] p-3 bg-slate-900 text-white rounded-lg shadow-lg hover:bg-slate-800 active:bg-slate-700 transition-colors touch-manipulation cursor-pointer"
          aria-label="Toggle menu"
          type="button"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      <main className="w-full lg:ml-64 flex-1 p-3 sm:p-4 lg:p-6 xl:p-8 transition-all duration-300 min-w-0">
        <div className="w-full min-w-0 max-w-full">
          {children}
        </div>
      </main>
    </div>
  );
}

