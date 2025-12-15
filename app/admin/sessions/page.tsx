'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { DataTable, Column } from '@/components/data-display/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Eye, History } from 'lucide-react';
import { format } from 'date-fns';

interface Session {
  id: string;
  customerName?: string;
  customerPhone?: string;
  category: string;
  status: string;
  storeName: string;
  userName: string;
  answerCount: number;
  recommendationCount: number;
  startedAt: string;
  completedAt?: string;
  convertedAt?: string;
}

interface SessionDetail {
  id: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  category: string;
  status: string;
  store: { name: string };
  user: { name: string };
  answers: Array<{
    question: { textEn: string };
    option: { textEn: string };
    answeredAt: string;
  }>;
  recommendations: Array<{
    product: {
      name: string;
      sku: string;
      brand?: string;
      basePrice: number;
    };
    matchScore: number;
    rank: number;
    isSelected: boolean;
  }>;
  startedAt: string;
  completedAt?: string;
  notes?: string;
}

export default function SessionsPage() {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, [statusFilter, categoryFilter]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);

      const response = await fetch(`/api/admin/sessions?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setSessions(data.data);
      }
    } catch (error) {
      console.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/sessions/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setSelectedSession(data.data);
      }
    } catch (error) {
      showToast('error', 'Failed to load session details');
    } finally {
      setDetailLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'CONVERTED':
        return 'green';
      case 'COMPLETED':
        return 'blue';
      case 'IN_PROGRESS':
        return 'yellow';
      case 'ABANDONED':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'EYEGLASSES':
        return 'blue';
      case 'SUNGLASSES':
        return 'yellow';
      case 'CONTACT_LENSES':
        return 'cyan';
      default:
        return 'gray';
    }
  };

  const columns: Column<Session>[] = [
    {
      key: 'customerName',
      header: 'Customer',
      render: (session) => (
        <div>
          <p className="font-medium">{session.customerName || 'Anonymous'}</p>
          {session.customerPhone && (
            <p className="text-xs text-slate-500">{session.customerPhone}</p>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (session) => (
        <Badge color={getCategoryBadgeColor(session.category)}>
          {session.category.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'storeName',
      header: 'Store',
      render: (session) => (
        <span className="text-sm">{session.storeName}</span>
      ),
    },
    {
      key: 'userName',
      header: 'Staff',
      render: (session) => (
        <span className="text-sm">{session.userName}</span>
      ),
    },
    {
      key: 'answerCount',
      header: 'Answers',
      render: (session) => (
        <span className="text-sm font-medium">{session.answerCount}</span>
      ),
    },
    {
      key: 'recommendationCount',
      header: 'Recommendations',
      render: (session) => (
        <span className="text-sm font-medium">{session.recommendationCount}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (session) => (
        <Badge color={getStatusBadgeColor(session.status)}>
          {session.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'startedAt',
      header: 'Started',
      render: (session) => (
        <span className="text-sm text-slate-600">
          {format(new Date(session.startedAt), 'MMM d, h:mm a')}
        </span>
      ),
    },
  ];

  return (
    <div className="w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 truncate">Sessions</h1>
          <p className="text-xs sm:text-sm lg:text-base text-slate-600 mt-1">View customer questionnaire sessions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Select
          placeholder="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'IN_PROGRESS', label: 'In Progress' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'CONVERTED', label: 'Converted' },
            { value: 'ABANDONED', label: 'Abandoned' },
          ]}
        />
        <Select
          placeholder="Filter by category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={[
            { value: '', label: 'All Categories' },
            { value: 'EYEGLASSES', label: 'Eyeglasses' },
            { value: 'SUNGLASSES', label: 'Sunglasses' },
            { value: 'CONTACT_LENSES', label: 'Contact Lenses' },
          ]}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        {sessions.length === 0 && !loading ? (
          <EmptyState
            icon={<History size={48} />}
            title="No sessions found"
            description="Customer sessions will appear here"
          />
        ) : (
          <div className="min-w-full">
            <DataTable
              columns={columns}
              data={sessions}
              loading={loading}
              rowActions={(session) => (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Eye size={14} />}
                  onClick={() => fetchSessionDetail(session.id)}
                  className="text-xs sm:text-sm px-2 sm:px-3"
                >
                  <span className="hidden sm:inline">View</span>
                  <span className="sm:hidden">V</span>
                </Button>
              )}
            />
          </div>
        )}
      </div>

      {/* Session Detail Modal */}
      <Modal
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        title="Session Details"
        size="lg"
      >
        {detailLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : selectedSession ? (
          <div className="space-y-4 sm:space-y-6 overflow-y-auto max-h-[85vh] pr-2">
            {/* Customer Info */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-2 text-sm sm:text-base">Customer Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 lg:gap-4 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-600">Name:</span>
                  <span className="ml-2 font-medium block sm:inline">
                    {selectedSession.customerName || 'Anonymous'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600">Phone:</span>
                  <span className="ml-2 font-medium block sm:inline">
                    {selectedSession.customerPhone || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600">Store:</span>
                  <span className="ml-2 font-medium block sm:inline">{selectedSession.store.name}</span>
                </div>
                <div>
                  <span className="text-slate-600">Staff:</span>
                  <span className="ml-2 font-medium block sm:inline">{selectedSession.user.name}</span>
                </div>
              </div>
            </div>

            {/* Answers */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-2 text-sm sm:text-base">
                Questionnaire Answers ({selectedSession.answers.length})
              </h3>
              <div className="space-y-2">
                {selectedSession.answers.map((answer, index) => (
                  <div
                    key={index}
                    className="p-2 sm:p-3 bg-slate-50 rounded-lg text-xs sm:text-sm"
                  >
                    <p className="font-medium text-slate-700 break-words">
                      {answer.question.textEn}
                    </p>
                    <p className="text-slate-600 mt-1 break-words">→ {answer.option.textEn}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-2 text-sm sm:text-base">
                Product Recommendations ({selectedSession.recommendations.length})
              </h3>
              <div className="space-y-2">
                {selectedSession.recommendations.map((rec) => (
                  <div
                    key={rec.rank}
                    className={`p-2 sm:p-3 rounded-lg border-2 ${
                      rec.isSelected
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                          <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                            #{rec.rank}
                          </span>
                          <span className="font-medium break-words text-xs sm:text-sm">{rec.product.name}</span>
                          {rec.isSelected && (
                            <Badge color="green" size="sm" className="text-xs">
                              SELECTED
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 break-words">
                          {rec.product.brand} • SKU: {rec.product.sku}
                        </p>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0">
                        <div className="font-bold text-blue-600 text-xs sm:text-sm">
                          {rec.matchScore.toFixed(1)}% Match
                        </div>
                        <div className="text-xs sm:text-sm text-slate-600">
                          ₹{rec.product.basePrice}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

