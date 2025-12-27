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
      if (data.success && Array.isArray(data.data)) {
        setSessions(data.data);
      } else {
        console.error('Invalid sessions API response:', data);
        setSessions([]);
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
          <p className="font-medium text-slate-900 dark:text-slate-200">{session.customerName || 'Anonymous'}</p>
          {session.customerPhone && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{session.customerPhone}</p>
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
        <span className="text-sm text-slate-900 dark:text-slate-200">{session.storeName}</span>
      ),
    },
    {
      key: 'userName',
      header: 'Staff',
      render: (session) => (
        <span className="text-sm text-slate-900 dark:text-slate-200">{session.userName}</span>
      ),
    },
    {
      key: 'answerCount',
      header: 'Answers',
      render: (session) => (
        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{session.answerCount}</span>
      ),
    },
    {
      key: 'recommendationCount',
      header: 'Recommendations',
      render: (session) => (
        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{session.recommendationCount}</span>
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
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {format(new Date(session.startedAt), 'MMM d, h:mm a')}
        </span>
      ),
    },
  ];

  return (
    <div className="w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white truncate">Sessions</h1>
          <p className="text-xs sm:text-sm lg:text-base text-slate-600 dark:text-slate-400 mt-1">View customer questionnaire sessions</p>
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
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto w-full">
        {sessions.length === 0 && !loading ? (
          <EmptyState
            icon={<History size={48} />}
            title="No sessions found"
            description="Customer sessions will appear here"
          />
        ) : (
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
          <div className="text-center py-8 text-slate-900 dark:text-white">Loading...</div>
        ) : selectedSession ? (
          <div className="space-y-4 sm:space-y-6 overflow-y-auto max-h-[85vh] pr-2">
            {/* Customer Info */}
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm sm:text-base">Customer Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 lg:gap-4 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Name:</span>
                  <span className="ml-2 font-medium block sm:inline text-slate-900 dark:text-white">
                    {selectedSession.customerName || 'Anonymous'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Phone:</span>
                  <span className="ml-2 font-medium block sm:inline text-slate-900 dark:text-white">
                    {selectedSession.customerPhone || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Store:</span>
                  <span className="ml-2 font-medium block sm:inline text-slate-900 dark:text-white">{selectedSession.store.name}</span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Staff:</span>
                  <span className="ml-2 font-medium block sm:inline text-slate-900 dark:text-white">{selectedSession.user.name}</span>
                </div>
              </div>
            </div>

            {/* Answers */}
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm sm:text-base">
                Questionnaire Answers ({selectedSession.answers.length})
              </h3>
              <div className="space-y-2">
                {selectedSession.answers.map((answer, index) => (
                  <div
                    key={index}
                    className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg text-xs sm:text-sm"
                  >
                    <p className="font-medium text-slate-700 dark:text-slate-300 break-words">
                      {answer.question?.textEn || 'Question not available'}
                    </p>
                    {answer.option && (
                      <p className="text-slate-600 dark:text-slate-400 mt-1 break-words">→ {answer.option.textEn}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm sm:text-base">
                Product Recommendations ({(selectedSession.recommendations || []).length})
              </h3>
              <div className="space-y-2">
                {(selectedSession.recommendations || []).length > 0 ? (
                  (selectedSession.recommendations || []).map((rec) => (
                  <div
                    key={rec.rank}
                    className={`p-2 sm:p-3 rounded-lg border-2 ${
                      rec.isSelected
                        ? 'border-green-500 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
                            #{rec.rank}
                          </span>
                          <span className="font-medium break-words text-xs sm:text-sm text-slate-900 dark:text-white">{rec.product.name}</span>
                          {rec.isSelected && (
                            <Badge color="green" size="sm" className="text-xs">
                              SELECTED
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 break-words">
                          {rec.product.brand} • SKU: {rec.product.sku}
                        </p>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0">
                        <div className="font-bold text-blue-600 dark:text-blue-400 text-xs sm:text-sm">
                          {rec.matchScore.toFixed(1)}% Match
                        </div>
                        <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                          ₹{rec.product.basePrice}
                        </div>
                      </div>
                    </div>
                  </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
                    No recommendations found for this session
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

