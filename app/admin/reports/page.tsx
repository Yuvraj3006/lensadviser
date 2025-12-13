'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/data-display/DataTable';
import { BarChart3, TrendingUp, Users, CheckCircle2 } from 'lucide-react';

interface OverviewData {
  totalSessions: number;
  completedSessions: number;
  convertedSessions: number;
  abandonedSessions: number;
  completionRate: number;
  conversionRate: number;
  dailyTrend: Array<{ date: string; sessions: number }>;
}

interface StoreStats {
  storeId: string;
  storeName: string;
  totalSessions: number;
  completedSessions: number;
  convertedSessions: number;
  completionRate: number;
  conversionRate: number;
}

interface CategoryStats {
  category: string;
  sessionCount: number;
  convertedCount: number;
  conversionRate: number;
}

export default function ReportsPage() {
  const { showToast } = useToast();
  const [reportType, setReportType] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Overview data
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);

  // Store-wise data
  const [storeStats, setStoreStats] = useState<StoreStats[]>([]);

  // Category data
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const params = new URLSearchParams({ type: reportType });

      const response = await fetch(`/api/admin/reports?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        if (reportType === 'overview') {
          setOverviewData(data.data);
        } else if (reportType === 'store') {
          setStoreStats(data.data.stores || []);
        } else if (reportType === 'category') {
          setCategoryStats(data.data.categories || []);
        }
      }
    } catch (error) {
      showToast('error', 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const storeColumns: Column<StoreStats>[] = [
    { key: 'storeName', header: 'Store Name' },
    { key: 'totalSessions', header: 'Total Sessions' },
    { key: 'completedSessions', header: 'Completed' },
    { key: 'convertedSessions', header: 'Converted' },
    {
      key: 'completionRate',
      header: 'Completion Rate',
      render: (store) => `${store.completionRate}%`,
    },
    {
      key: 'conversionRate',
      header: 'Conversion Rate',
      render: (store) => `${store.conversionRate}%`,
    },
  ];

  const categoryColumns: Column<CategoryStats>[] = [
    {
      key: 'category',
      header: 'Category',
      render: (cat) => cat.category.replace('_', ' '),
    },
    { key: 'sessionCount', header: 'Sessions' },
    { key: 'convertedCount', header: 'Converted' },
    {
      key: 'conversionRate',
      header: 'Conversion Rate',
      render: (cat) => `${cat.conversionRate}%`,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Track performance and insights</p>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="mb-6">
        <Select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          options={[
            { value: 'overview', label: 'Overview' },
            { value: 'store', label: 'Store-wise Performance' },
            { value: 'category', label: 'Category Breakdown' },
          ]}
        />
      </div>

      {/* Overview Report */}
      {reportType === 'overview' && overviewData && !loading && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Sessions"
              value={overviewData.totalSessions}
              icon={<BarChart3 size={24} />}
              color="blue"
            />
            <StatCard
              title="Completed Sessions"
              value={overviewData.completedSessions}
              icon={<CheckCircle2 size={24} />}
              color="green"
            />
            <StatCard
              title="Converted Sessions"
              value={overviewData.convertedSessions}
              icon={<TrendingUp size={24} />}
              color="purple"
            />
            <StatCard
              title="Conversion Rate"
              value={`${overviewData.conversionRate}%`}
              icon={<Users size={24} />}
              color="yellow"
            />
          </div>

          {/* Daily Trend */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Daily Trend (Last 7 Days)
            </h2>
            <div className="space-y-2">
              {overviewData.dailyTrend.map((day, index) => (
                <div key={index} className="flex items-center gap-4">
                  <span className="text-sm text-slate-600 w-32">
                    {new Date(day.date).toLocaleDateString()}
                  </span>
                  <div className="flex-1 bg-slate-100 rounded-full h-8 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-full flex items-center px-3 text-white text-sm font-medium"
                      style={{
                        width: `${Math.min((day.sessions / 20) * 100, 100)}%`,
                      }}
                    >
                      {day.sessions} sessions
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Store-wise Report */}
      {reportType === 'store' && !loading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <DataTable columns={storeColumns} data={storeStats} loading={loading} />
        </div>
      )}

      {/* Category Report */}
      {reportType === 'category' && !loading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <DataTable columns={categoryColumns} data={categoryStats} loading={loading} />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600 mt-4">Loading report...</p>
        </div>
      )}
    </div>
  );
}

