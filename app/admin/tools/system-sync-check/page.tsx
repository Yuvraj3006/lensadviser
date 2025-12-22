'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { RefreshCw, CheckCircle, AlertCircle, XCircle, Database, Eye, Tag, Package, Settings, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SyncIssue {
  module: string;
  severity: 'error' | 'warning';
  message: string;
  count?: number;
}

interface SyncCheckResult {
  summary: {
    totalIssues: number;
    errors: number;
    warnings: number;
    status: 'ok' | 'warning' | 'error';
  };
  issues: SyncIssue[];
  checkedAt: string;
}

export default function SystemSyncCheckPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [organizationId, setOrganizationId] = useState('');
  const [result, setResult] = useState<SyncCheckResult | null>(null);

  useEffect(() => {
    // Get organization ID from auth
    const token = localStorage.getItem('lenstrack_token');
    if (token) {
      fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data?.organizationId) {
            setOrganizationId(data.data.organizationId);
            // Auto-run check
            handleCheck(data.data.organizationId);
          }
        });
    }
  }, []);

  const handleCheck = async (orgId?: string) => {
    const id = orgId || organizationId;
    if (!id) {
      showToast('error', 'Organization ID not found');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/system-sync-check?organizationId=${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('lenstrack_token')}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
        if (data.data.summary.status === 'ok') {
          showToast('success', 'System sync check passed!');
        } else {
          showToast('warning', `Found ${data.data.summary.totalIssues} issues`);
        }
      } else {
        showToast('error', data.error?.message || 'Failed to check system sync');
      }
    } catch (error) {
      console.error('Error checking system sync:', error);
      showToast('error', 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getModuleIcon = (module: string) => {
    if (module.includes('Benefit')) return <Tag size={18} />;
    if (module.includes('Tint') || module.includes('Mirror')) return <Eye size={18} />;
    if (module.includes('Rx') || module.includes('Range')) return <Database size={18} />;
    if (module.includes('Offer')) return <Package size={18} />;
    return <Settings size={18} />;
  };

  return (
    <div className="min-h-safe-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2 sm:gap-3">
              <Database size={24} className="sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
              System Sync Check
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">Validate system consistency across all modules</p>
          </div>
          <Button
            onClick={() => handleCheck()}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Checking...' : 'Run Check'}
          </Button>
        </div>

        {result ? (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Summary</h2>
                <Badge
                  className={
                    result.summary.status === 'ok'
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : result.summary.status === 'warning'
                      ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                      : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                  }
                >
                  {result.summary.status.toUpperCase()}
                </Badge>
              </div>
              
              <div className="grid md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Issues</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{result.summary.totalIssues}</p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 mb-1">Errors</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">{result.summary.errors}</p>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">Warnings</p>
                  <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{result.summary.warnings}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Checked At</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {new Date(result.checkedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>

            {/* Issues List */}
            {result.issues.length > 0 ? (
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Issues Found</h2>
                <div className="space-y-3">
                  {result.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-2 ${
                        issue.severity === 'error'
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 ${
                          issue.severity === 'error' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                        }`}>
                          {issue.severity === 'error' ? (
                            <XCircle size={20} />
                          ) : (
                            <AlertCircle size={20} />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-slate-600 dark:text-slate-400">
                              {getModuleIcon(issue.module)}
                            </div>
                            <span className="font-semibold text-slate-900 dark:text-white">{issue.module}</span>
                            <Badge
                              className={
                                issue.severity === 'error'
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                              }
                            >
                              {issue.severity.toUpperCase()}
                            </Badge>
                            {issue.count !== undefined && (
                              <Badge variant="outline">{issue.count} items</Badge>
                            )}
                          </div>
                          <p className="text-slate-700 dark:text-slate-300">{issue.message}</p>
                          {(issue.module === 'Offer Rule Consistency' || 
                            issue.module === 'Rx Range Validation' || 
                            issue.module === 'Lens-Benefit Mapping' ||
                            issue.module === 'Tint/Mirror Eligibility' ||
                            issue.module === 'Answer-Benefit Mapping' ||
                            issue.module === 'Band Pricing') && (
                            <div className="mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (issue.module === 'Offer Rule Consistency') {
                                    router.push('/admin/offers/rules');
                                  } else if (issue.module === 'Rx Range Validation' || 
                                             issue.module === 'Lens-Benefit Mapping' ||
                                             issue.module === 'Tint/Mirror Eligibility' ||
                                             issue.module === 'Band Pricing') {
                                    router.push('/admin/lens-products');
                                  } else if (issue.module === 'Answer-Benefit Mapping') {
                                    router.push('/admin/questionnaire');
                                  }
                                }}
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                              >
                                <ExternalLink size={14} className="mr-2" />
                                {issue.module === 'Offer Rule Consistency' && 'Go to Offer Rules'}
                                {(issue.module === 'Rx Range Validation' || 
                                  issue.module === 'Lens-Benefit Mapping' ||
                                  issue.module === 'Tint/Mirror Eligibility' ||
                                  issue.module === 'Band Pricing') && 'Go to Lens Products'}
                                {issue.module === 'Answer-Benefit Mapping' && 'Go to Questionnaire Builder'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <Card className="p-12 text-center">
                <CheckCircle size={48} className="mx-auto text-green-600 dark:text-green-400 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">All Checks Passed!</h3>
                <p className="text-slate-600 dark:text-slate-400">No issues found in system synchronization</p>
              </Card>
            )}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Database size={48} className="mx-auto text-slate-400 dark:text-slate-500 mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Click "Run Check" to validate system consistency</p>
          </Card>
        )}
      </div>
    </div>
  );
}
