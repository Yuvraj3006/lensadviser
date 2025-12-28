'use client';

/**
 * Admin Benefits Page
 * Manage Benefits master (B01-B12)
 */

import { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { DataTable, Column } from '@/components/data-display/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Plus, Edit2, Trash2, TrendingUp, FileSpreadsheet } from 'lucide-react';

interface Benefit {
  id: string;
  code: string; // B01-B12
  name: string;
  description?: string | null;
  pointWeight: number;
  maxScore: number;
  isActive: boolean;
  questionMappingCount: number;
  productMappingCount: number;
}

interface BenefitFormData {
  code: string;
  name: string;
  description: string;
  pointWeight: number;
  maxScore: number;
}

export default function BenefitsPage() {
  const { showToast } = useToast();
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<Benefit | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Benefit | null>(null);
  const [formData, setFormData] = useState<BenefitFormData>({
    code: '',
    name: '',
    description: '',
    pointWeight: 1.0,
    maxScore: 3.0,
  });
  const [submitting, setSubmitting] = useState(false);
  
  // Excel upload state
  const [isExcelUploadOpen, setIsExcelUploadOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
    errors: Array<{ code: string; error: string }>;
    validationErrors: Array<{ row: number; error: string }>;
  } | null>(null);

  useEffect(() => {
    fetchBenefits();
  }, []);

  const fetchBenefits = async () => {
    setLoading(true);
    try {
      // SECURITY: Use authenticated fetch with httpOnly cookie
      const { authenticatedFetch } = await import('@/lib/api-client');

      const response = await authenticatedFetch('/api/admin/benefits');

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        // Sort by code (B01, B02, ...)
        const sorted = [...data.data].sort((a: Benefit, b: Benefit) =>
          a.code.localeCompare(b.code)
        );
        setBenefits(sorted);
      } else {
        console.error('Invalid API response:', data);
        showToast('error', 'Invalid response from server');
        setBenefits([]);
      }
    } catch (error) {
      console.error('Failed to load benefits');
      showToast('error', 'Failed to load benefits');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      pointWeight: 1.0,
      maxScore: 3.0,
    });
    setEditingBenefit(null);
    setIsCreateOpen(true);
  };

  const handleEdit = (benefit: Benefit) => {
    setFormData({
      code: benefit.code,
      name: benefit.name,
      description: benefit.description || '',
      pointWeight: benefit.pointWeight,
      maxScore: benefit.maxScore,
    });
    setEditingBenefit(benefit);
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // SECURITY: Use authenticated API client
      const { apiPost, apiPut } = await import('@/lib/api-client');
      const url = editingBenefit
        ? `/api/admin/benefits/${editingBenefit.id}`
        : '/api/admin/benefits';

      const response = editingBenefit
        ? await apiPut(url, formData)
        : await apiPost(url, formData);

      const data = await response.json();

      if (data.success) {
        showToast('success', `Benefit ${editingBenefit ? 'updated' : 'created'} successfully`);
        setIsCreateOpen(false);
        fetchBenefits();
      } else {
        showToast('error', data.error?.message || 'Operation failed');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      // SECURITY: Use authenticated API client
      const { apiDelete } = await import('@/lib/api-client');
      const response = await apiDelete(`/api/admin/benefits/${deleteConfirm.id}`);

      const data = await response.json();

      if (data.success) {
        showToast('success', 'Benefit deactivated successfully');
        setDeleteConfirm(null);
        fetchBenefits();
      } else {
        showToast('error', data.error?.message || 'Failed to delete benefit');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    }
  };

  const isCoreBenefit = (code: string): boolean => {
    return /^B\d{2}$/.test(code) && parseInt(code.substring(1)) <= 12;
  };

  const handleExcelUpload = async () => {
    if (!excelFile) {
      showToast('error', 'Please select an Excel file');
      return;
    }

    setUploadingExcel(true);
    setUploadResult(null);

    try {
      // SECURITY: Use authenticated fetch with httpOnly cookie
      const { authenticatedFetch } = await import('@/lib/api-client');
      
      const formData = new FormData();
      formData.append('file', excelFile);

      const response = await authenticatedFetch('/api/admin/benefits/upload-excel', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadResult(data.data);
        showToast('success', `Successfully processed ${data.data.created + data.data.updated} benefits`);
        setExcelFile(null);
        fetchBenefits(); // Refresh the benefits list
        
        // Auto-close modal after 3 seconds if successful
        if (data.data.errors.length === 0 && data.data.validationErrors.length === 0) {
          setTimeout(() => {
            setIsExcelUploadOpen(false);
            setUploadResult(null);
          }, 3000);
        }
      } else {
        showToast('error', data.error?.message || 'Failed to upload Excel file');
        if (data.error?.errors) {
          setUploadResult({
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
            validationErrors: data.error.errors,
          });
        }
      }
    } catch (error) {
      console.error('Excel upload error:', error);
      showToast('error', 'An error occurred while uploading the file');
    } finally {
      setUploadingExcel(false);
    }
  };

  const columns: Column<Benefit>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (benefit) => (
        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{benefit.code}</span>
      ),
    },
    {
      key: 'name',
      header: 'Benefit Name',
      render: (benefit) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-200">{benefit.name}</p>
          {benefit.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{benefit.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'maxScore',
      header: 'Max Score',
      render: (benefit) => (
        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{benefit.maxScore}</span>
      ),
    },
    {
      key: 'questionMappingCount',
      header: 'Question Mappings',
      render: (benefit) => (
        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{benefit.questionMappingCount}</span>
      ),
    },
    {
      key: 'productMappingCount',
      header: 'Product Mappings',
      render: (benefit) => (
        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{benefit.productMappingCount}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (benefit) => (
        <Badge color={benefit.isActive ? 'green' : 'red'}>
          {benefit.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Benefits</h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">Manage benefits used in questionnaire and lens scoring</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            icon={<FileSpreadsheet size={18} />} 
            onClick={() => setIsExcelUploadOpen(true)} 
            variant="outline"
            className="w-full sm:w-auto"
          >
            <span className="hidden sm:inline">Upload Excel</span>
            <span className="sm:hidden">Excel</span>
          </Button>
          <Button icon={<Plus size={18} />} onClick={handleCreate} className="w-full sm:w-auto">
            Add Benefit
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        {benefits.length === 0 && !loading ? (
          <EmptyState
            icon={<TrendingUp size={48} />}
            title="No benefits found"
            description="Create benefits to map questionnaire answers to lens recommendations"
            action={{
              label: 'Add Benefit',
              onClick: handleCreate,
            }}
          />
        ) : (
          <DataTable
            columns={columns}
            data={benefits}
            loading={loading}
            rowActions={(benefit) => (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Edit2 size={14} />}
                  onClick={() => handleEdit(benefit)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 size={14} />}
                  onClick={() => setDeleteConfirm(benefit)}
                  className="text-xs sm:text-sm px-2 sm:px-3"
                >
                  <span className="hidden sm:inline">Deactivate</span>
                  <span className="sm:hidden">D</span>
                </Button>
              </div>
            )}
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={editingBenefit ? 'Edit Benefit' : 'Create Benefit'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingBenefit ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Benefit Code"
            placeholder="B13"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            required
            disabled={editingBenefit !== null}
            hint={editingBenefit 
              ? "Benefit code cannot be changed after creation" 
              : "Must be B followed by 2+ digits (e.g., B01, B13)"}
          />

          <Input
            label="Benefit Name"
            placeholder="Benefit Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Description"
            placeholder="Benefit description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={2}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Point Weight"
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={formData.pointWeight}
              onChange={(e) => setFormData({ ...formData, pointWeight: parseFloat(e.target.value) || 1.0 })}
              hint="Global importance weight"
            />

            <Input
              label="Max Score"
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={formData.maxScore}
              onChange={(e) => setFormData({ ...formData, maxScore: parseFloat(e.target.value) || 3.0 })}
              hint="Maximum score (usually 3)"
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Deactivate Benefit"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Deactivate
            </Button>
          </>
        }
      >
        <p className="text-slate-600 dark:text-slate-400">
          Are you sure you want to deactivate <strong className="text-slate-900 dark:text-white">{deleteConfirm?.name}</strong> ({deleteConfirm?.code})?
          This will not affect existing mappings.
        </p>
      </Modal>

      {/* Excel Upload Modal */}
      <Modal
        isOpen={isExcelUploadOpen}
        onClose={() => {
          setIsExcelUploadOpen(false);
          setExcelFile(null);
          setUploadResult(null);
        }}
        title="Upload Benefits from Excel"
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIsExcelUploadOpen(false);
                setExcelFile(null);
                setUploadResult(null);
              }}
            >
              Close
            </Button>
            <Button onClick={handleExcelUpload} loading={uploadingExcel} disabled={!excelFile}>
              Upload & Process
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Upload an Excel file (.xlsx, .xls, or .csv) to create or update benefits in bulk.
            </p>
            
            <div className="mb-4">
              <a
                href="/benefits-template.xlsx"
                download
                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <FileSpreadsheet size={16} />
                Download Template
              </a>
            </div>
            
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                Required Columns:
              </p>
              <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li><strong>code</strong> - Benefit code (e.g., B01, B13) - Must start with B followed by digits</li>
                <li><strong>name</strong> - Benefit name</li>
              </ul>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mt-3 mb-2">
                Optional Columns:
              </p>
              <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li><strong>description</strong> - Benefit description</li>
                <li><strong>pointWeight</strong> - Point weight (0-10, default: 1.0)</li>
                <li><strong>maxScore</strong> - Maximum score (0-10, default: 3.0)</li>
              </ul>
            </div>

            <label className="block cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setExcelFile(file);
                    setUploadResult(null);
                  }
                }}
              />
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                <FileSpreadsheet size={20} className="text-slate-500 dark:text-slate-400" />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {excelFile ? excelFile.name : 'Click to select Excel file'}
                </span>
              </div>
            </label>
          </div>

          {uploadResult && (
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Upload Results:
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Total Processed:</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {uploadResult.created + uploadResult.updated + uploadResult.skipped}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600 dark:text-green-400">Created:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {uploadResult.created}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-600 dark:text-blue-400">Updated:</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {uploadResult.updated}
                  </span>
                </div>
                {uploadResult.skipped > 0 && (
                  <div className="flex justify-between">
                    <span className="text-yellow-600 dark:text-yellow-400">Skipped:</span>
                    <span className="font-medium text-yellow-600 dark:text-yellow-400">
                      {uploadResult.skipped}
                    </span>
                  </div>
                )}
              </div>

              {uploadResult.errors.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
                    Errors ({uploadResult.errors.length}):
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {uploadResult.errors.map((err, idx) => (
                      <p key={idx} className="text-xs text-red-600 dark:text-red-400">
                        {err.code}: {err.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {uploadResult.validationErrors.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                  <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
                    Validation Errors ({uploadResult.validationErrors.length}):
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {uploadResult.validationErrors.map((err, idx) => (
                      <p key={idx} className="text-xs text-yellow-600 dark:text-yellow-400">
                        Row {err.row}: {err.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
