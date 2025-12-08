'use client';

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
    label: 'Prescriptions',
    href: '/admin/prescriptions',
    icon: <FileText size={20} />,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const visibleItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Glasses size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold">LensTrack</h1>
            <p className="text-xs text-slate-400">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-800">
        <div className="mb-3">
          <p className="text-sm font-medium text-white">{user?.name}</p>
          <p className="text-xs text-slate-400">{user?.email}</p>
          <p className="text-xs text-blue-400 mt-1">{user?.role.replace('_', ' ')}</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 w-full rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}

