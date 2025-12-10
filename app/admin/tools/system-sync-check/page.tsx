'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { RefreshCw, CheckCircle, AlertCircle, XCircle, Database, Eye, Tag, Package, Settings } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <Database size={32} className="text-blue-600" />
              System Sync Check
            </h1>
            <p className="text-slate-600">Validate system consistency across all modules</p>
          </div>
          <Button
            onClick={() => handleCheck()}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
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
                <h2 className="text-xl font-semibold text-slate-900">Summary</h2>
                <Badge
                  className={
                    result.summary.status === 'ok'
                      ? 'bg-green-100 text-green-700'
                      : result.summary.status === 'warning'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }
                >
                  {result.summary.status.toUpperCase()}
                </Badge>
              </div>
              
              <div className="grid md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">Total Issues</p>
                  <p className="text-2xl font-bold text-slate-900">{result.summary.totalIssues}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600 mb-1">Errors</p>
                  <p className="text-2xl font-bold text-red-700">{result.summary.errors}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-600 mb-1">Warnings</p>
                  <p className="text-2xl font-bold text-yellow-700">{result.summary.warnings}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">Checked At</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {new Date(result.checkedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>

            {/* Issues List */}
            {result.issues.length > 0 ? (
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Issues Found</h2>
                <div className="space-y-3">
                  {result.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-2 ${
                        issue.severity === 'error'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 ${
                          issue.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {issue.severity === 'error' ? (
                            <XCircle size={20} />
                          ) : (
                            <AlertCircle size={20} />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-slate-600">
                              {getModuleIcon(issue.module)}
                            </div>
                            <span className="font-semibold text-slate-900">{issue.module}</span>
                            <Badge
                              className={
                                issue.severity === 'error'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }
                            >
                              {issue.severity.toUpperCase()}
                            </Badge>
                            {issue.count !== undefined && (
                              <Badge variant="outline">{issue.count} items</Badge>
                            )}
                          </div>
                          <p className="text-slate-700">{issue.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <Card className="p-12 text-center">
                <CheckCircle size={48} className="mx-auto text-green-600 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">All Checks Passed!</h3>
                <p className="text-slate-600">No issues found in system synchronization</p>
              </Card>
            )}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Database size={48} className="mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600">Click "Run Check" to validate system consistency</p>
          </Card>
        )}
      </div>
    </div>
  );
}
