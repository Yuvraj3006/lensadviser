'use client';

import { useEffect, useState } from 'react';
import { StatCard } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/data-display/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';
import { RefreshCw, Users, CheckCircle2, TrendingUp, XCircle } from 'lucide-react';

interface DashboardStats {
  totalSessions: number;
  completedSessions: number;
  convertedSessions: number;
  abandonedSessions: number;
}

interface RecentSession {
  id: string;
  customerName: string;
  storeName: string;
  staffName: string;
  status: string;
  startedAt: string;
}

export default function DashboardPage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0,
    completedSessions: 0,
    convertedSessions: 0,
    abandonedSessions: 0,
  });
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      if (!token) {
        showToast('error', 'Please login again');
        return;
      }

      // Fetch dashboard stats from reports API
      const reportsResponse = await fetch('/api/admin/reports?type=overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const reportsData = await reportsResponse.json();
      
      if (reportsData.success) {
        setStats({
          totalSessions: reportsData.data.totalSessions || 0,
          completedSessions: reportsData.data.completedSessions || 0,
          convertedSessions: reportsData.data.convertedSessions || 0,
          abandonedSessions: reportsData.data.abandonedSessions || 0,
        });
      }

      // Fetch recent sessions
      const sessionsResponse = await fetch('/api/admin/sessions?limit=10', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sessionsData = await sessionsResponse.json();
      
      if (sessionsData.success) {
        const formattedSessions = sessionsData.data.slice(0, 10).map((session: any) => ({
          id: session.id,
          customerName: session.customerName || 'Anonymous',
          storeName: session.storeName || 'Unknown Store',
          staffName: session.userName || 'N/A',
          status: session.status,
          startedAt: formatTimeAgo(session.startedAt),
        }));
        setRecentSessions(formattedSessions);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      showToast('error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const columns: Column<RecentSession>[] = [
    {
      key: 'customerName',
      header: 'Customer',
      render: (session) => (
        <div>
          <p className="font-medium">{session.customerName}</p>
        </div>
      ),
    },
    {
      key: 'storeName',
      header: 'Store',
    },
    {
      key: 'staffName',
      header: 'Staff',
    },
    {
      key: 'status',
      header: 'Status',
      render: (session) => {
        const colors: Record<string, any> = {
          CONVERTED: 'green',
          COMPLETED: 'blue',
          IN_PROGRESS: 'yellow',
          ABANDONED: 'red',
        };
        return (
          <Badge color={colors[session.status] || 'gray'}>
            {session.status.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      key: 'startedAt',
      header: 'Time',
    },
  ];

  const conversionRate = stats.totalSessions > 0
    ? ((stats.convertedSessions / stats.totalSessions) * 100).toFixed(1)
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Overview of your store performance</p>
        </div>
        <Button
          variant="outline"
          icon={<RefreshCw size={18} />}
          onClick={loadDashboardData}
          loading={loading}
          className="w-full sm:w-auto"
        >
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Sessions"
          value={stats.totalSessions}
          icon={<Users size={24} />}
          color="blue"
          trend={{ value: 12, direction: 'up', label: 'vs last week' }}
        />
        <StatCard
          title="Completed Sessions"
          value={stats.completedSessions}
          icon={<CheckCircle2 size={24} />}
          color="green"
          trend={{ value: 8, direction: 'up', label: 'vs last week' }}
        />
        <StatCard
          title="Converted Sessions"
          value={stats.convertedSessions}
          icon={<TrendingUp size={24} />}
          color="purple"
          trend={{ value: 15, direction: 'up', label: 'vs last week' }}
        />
        <StatCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={<XCircle size={24} />}
          color="yellow"
        />
      </div>

      {/* Recent Sessions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">Recent Sessions</h2>
        </div>
        <DataTable
          columns={columns}
          data={recentSessions}
          loading={loading}
          emptyMessage="No sessions found"
        />
      </div>
    </div>
  );
}

