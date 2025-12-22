'use client';

import Link from 'next/link';
import { Calculator, TrendingUp, RefreshCw, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const tools = [
  {
    id: 'power-converter',
    title: 'Power Converter',
    description: 'Convert spectacle power to contact lens power for accurate contact lens fitting',
    icon: Calculator,
    href: '/admin/tools/power-converter',
    color: 'blue',
  },
  {
    id: 'offer-simulator',
    title: 'Offer Simulator',
    description: 'Test and simulate offer calculations with different product combinations',
    icon: TrendingUp,
    href: '/admin/tools/offer-simulator',
    color: 'purple',
  },
  {
    id: 'system-sync-check',
    title: 'System Sync Check',
    description: 'Check for data synchronization issues across different modules',
    icon: RefreshCw,
    href: '/admin/tools/system-sync-check',
    color: 'green',
  },
];

export default function ToolsPage() {
  return (
    <div className="min-h-safe-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Admin Tools</h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">Utility tools for system management and testing</p>
        </div>

        {/* Tools Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const colorClasses = {
              blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-700 text-blue-600 dark:text-blue-400',
              purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-700 text-purple-600 dark:text-purple-400',
              green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-700 text-green-600 dark:text-green-400',
            };

            return (
              <Link key={tool.id} href={tool.href}>
                <Card className={`p-6 h-full transition-all hover:shadow-lg cursor-pointer border-2 ${colorClasses[tool.color as keyof typeof colorClasses]}`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-white dark:bg-slate-800 ${tool.color === 'blue' ? 'text-blue-600 dark:text-blue-400' : tool.color === 'purple' ? 'text-purple-600 dark:text-purple-400' : 'text-green-600 dark:text-green-400'}`}>
                      <Icon size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                        {tool.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        {tool.description}
                      </p>
                      <div className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
                        Open Tool
                        <ArrowRight size={16} className="ml-2" />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">About Admin Tools</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            These tools help you manage and test various aspects of the system. Use them to convert prescriptions, 
            simulate offers, and check system health.
          </p>
        </div>
      </div>
    </div>
  );
}

