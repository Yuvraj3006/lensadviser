'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Store,
  Users,
  Package,
  HelpCircle,
  Sparkles,
  BarChart3,
  History,
  Glasses,
  LogOut,
  Tag,
  Percent,
  Ticket,
  Calculator,
  FileText,
  ShoppingCart,
  TrendingUp,
  Eye,
  Settings,
  Menu,
  X,
} from 'lucide-react';
// UserRole enum - defined inline since Prisma doesn't export unused enums
enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  STORE_MANAGER = 'STORE_MANAGER',
  SALES_EXECUTIVE = 'SALES_EXECUTIVE',
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: <LayoutDashboard size={20} />,
  },
  {
    label: 'Stores',
    href: '/admin/stores',
    icon: <Store size={20} />,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    label: 'Users',
    href: '/admin/users',
    icon: <Users size={20} />,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_MANAGER],
  },
  {
    label: 'Brands & Sub-Brands',
    href: '/admin/brands',
    icon: <Tag size={20} />,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    label: 'Retail Products',
    href: '/admin/products',
    icon: <Package size={20} />,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    label: 'Lens Brands',
    href: '/admin/lens-brands',
    icon: <Tag size={20} />,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    label: 'Lens Products',
    href: '/admin/lens-products',
    icon: <Glasses size={20} />,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    label: 'Contact Lens Products',
    href: '/admin/contact-lens-products',
    icon: <Eye size={20} />,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    label: 'Questionnaire Builder',
    href: '/admin/questionnaire',
    icon: <HelpCircle size={20} />,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    label: 'Features',
    href: '/admin/features',
    icon: <Sparkles size={20} />,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    label: 'Benefits',
    href: '/admin/benefits',
    icon: <TrendingUp size={20} />,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    label: 'Offer Rules',
    href: '/admin/offers/rules',
    icon: <Tag size={20} />,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    label: 'Combo Tiers',
    href: '/admin/combo-tiers',
    icon: <Package size={20} />,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    label: 'Category Discounts',
    href: '/admin/offers/category-discounts',
    icon: <Percent size={20} />,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    label: 'Coupons',
    href: '/admin/offers/coupons',
    icon: <Ticket size={20} />,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: <Settings size={20} />,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    label: 'Tools',
    href: '/admin/tools',
    icon: <Ticket size={20} />,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    label: 'Offer Calculator',
    href: '/admin/offers/calculator',
    icon: <Calculator size={20} />,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_MANAGER],
  },
  {
    label: 'Reports',
    href: '/admin/reports',
    icon: <BarChart3 size={20} />,
  },
  {
    label: 'Sessions',
    href: '/admin/sessions',
    icon: <History size={20} />,
  },
  {
    label: 'POS Orders',
    href: '/admin/pos/orders',
    icon: <ShoppingCart size={20} />,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_MANAGER],
  },
  {
    label: 'Power Converter',
    href: '/admin/tools/power-converter',
    icon: <Calculator size={20} />,
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_MANAGER, UserRole.SALES_EXECUTIVE],
  },
  {
    label: 'Prescriptions',
    href: '/admin/prescriptions',
    icon: <FileText size={20} />,
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean; // Allow parent to control mobile state
}

export function Sidebar({ isOpen: controlledIsOpen, onClose, isMobile: externalIsMobile }: SidebarProps = {}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  // Initialize with true for SSR safety, will be updated on mount
  const [internalIsMobile, setInternalIsMobile] = useState(true);
  
  // Use external isMobile if provided, otherwise use internal state
  const isMobile = externalIsMobile !== undefined ? externalIsMobile : internalIsMobile;

  // Check if mobile on mount and resize (only if not controlled externally)
  useEffect(() => {
    if (externalIsMobile !== undefined) {
      // Parent is controlling mobile state, don't set internal state
      return;
    }
    
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setInternalIsMobile(mobile);
      if (!mobile) {
        setIsMobileOpen(false);
        // Close sidebar when switching to desktop (only if controlled)
        if (controlledIsOpen !== undefined) {
          onClose?.();
        }
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [controlledIsOpen, externalIsMobile]); // Removed onClose to prevent unnecessary re-runs

  // Close mobile menu when route changes (only if controlled)
  useEffect(() => {
    if (isMobile && controlledIsOpen !== undefined) {
      // Only close if parent is controlling the state
      onClose?.();
    }
  }, [pathname, isMobile]); // Removed onClose and controlledIsOpen from deps to prevent unnecessary closes

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : isMobileOpen;
  
  // Debug logging
  useEffect(() => {
    if (isMobile) {
      console.log('[Sidebar] State update:', { 
        controlledIsOpen, 
        isMobileOpen, 
        isOpen, 
        isMobile,
        externalIsMobile,
        internalIsMobile
      });
      console.log('[Sidebar] Sidebar should be:', isOpen ? 'VISIBLE' : 'HIDDEN');
      console.log('[Sidebar] Transform class:', isMobile 
        ? (isOpen ? 'translate-x-0' : '-translate-x-full')
        : 'translate-x-0');
    }
  }, [controlledIsOpen, isMobileOpen, isOpen, isMobile, externalIsMobile, internalIsMobile]);
  
  const handleClose = () => {
    console.log('[Sidebar] handleClose called', { controlledIsOpen, isMobileOpen });
    if (controlledIsOpen === undefined) {
      setIsMobileOpen(false);
    } else {
      onClose?.();
    }
  };

  const visibleItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-4 lg:p-6 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Glasses size={20} className="lg:w-6 lg:h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base lg:text-lg font-bold truncate">LensTrack</h1>
              <p className="text-xs text-slate-400 hidden lg:block">Admin Panel</p>
            </div>
          </div>
          {/* Mobile close button */}
          {isMobile && (
            <button
              onClick={handleClose}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 lg:p-4 overflow-y-auto">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={handleClose}
                  className={clsx(
                    'flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg transition-colors text-sm lg:text-base',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="font-medium truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info & Logout */}
      <div className="p-3 lg:p-4 border-t border-slate-800">
        <div className="mb-2 lg:mb-3">
          <p className="text-xs lg:text-sm font-medium text-white truncate">{user?.name}</p>
          <p className="text-xs text-slate-400 truncate hidden lg:block">{user?.email}</p>
          <p className="text-xs text-blue-400 mt-1 hidden lg:block">{user?.role.replace('_', ' ')}</p>
        </div>
        <button
          onClick={() => {
            handleClose();
            logout();
          }}
          className="flex items-center gap-2 px-3 lg:px-4 py-2 w-full rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-sm lg:text-base"
        >
          <LogOut size={16} className="lg:w-[18px] lg:h-[18px]" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[45] lg:hidden"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleClose();
          }}
          style={{ touchAction: 'none' }}
        />
      )}

      {/* Sidebar - Always render, use transform to show/hide */}
      <aside
        className={clsx(
          'bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 z-[55] transition-transform duration-300 ease-in-out',
          'w-64 lg:w-64', // Fixed width
          isMobile
            ? isOpen
              ? 'translate-x-0'
              : '-translate-x-full'
            : 'translate-x-0'
        )}
        aria-hidden={isMobile && !isOpen}
        style={{ 
          willChange: 'transform',
          WebkitTransform: 'translateZ(0)',
          touchAction: 'pan-y',
        }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

// Mobile menu button component
export function SidebarToggle() {
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isMobile) return null;

  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded-lg shadow-lg hover:bg-slate-800 transition-colors"
    >
      <Menu size={24} />
    </button>
  );
}

