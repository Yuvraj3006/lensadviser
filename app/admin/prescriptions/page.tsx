'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable, Column } from '@/components/data-display/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Plus, Eye, FileText } from 'lucide-react';

interface Prescription {
  id: string;
  customerName?: string | null;
  customerPhone?: string | null;
  odSphere?: number | null;
  odCylinder?: number | null;
  odAxis?: number | null;
  odAdd?: number | null;
  osSphere?: number | null;
  osCylinder?: number | null;
  osAxis?: number | null;
  osAdd?: number | null;
  pdDistance?: number | null;
  pdNear?: number | null;
  pdSingle?: number | null;
  prescriptionType?: string | null;
  doctorName?: string | null;
  doctorLicense?: string | null;
  prescriptionDate?: string | null;
  createdAt: string;
}

export default function PrescriptionsPage() {
  const { showToast } = useToast();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingPrescription, setViewingPrescription] = useState<Prescription | null>(null);
  const [formData, setFormData] = useState<Partial<Prescription>>({
    customerName: '',
    customerPhone: '',
    odSphere: undefined,
    odCylinder: undefined,
    odAxis: undefined,
    odAdd: undefined,
    osSphere: undefined,
    osCylinder: undefined,
    osAxis: undefined,
    osAdd: undefined,
    pdDistance: undefined,
    pdNear: undefined,
    pdSingle: undefined,
    prescriptionType: '',
    doctorName: '',
    doctorLicense: '',
    prescriptionDate: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch('/api/admin/prescriptions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setPrescriptions(data.data);
      }
    } catch (error) {
      showToast('error', 'Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch('/api/admin/prescriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        showToast('success', 'Prescription created successfully');
        setIsCreateOpen(false);
        setFormData({
          customerName: '',
          customerPhone: '',
        });
        fetchPrescriptions();
      } else {
        showToast('error', data.error?.message || 'Failed to create prescription');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<Prescription>[] = [
    {
      key: 'customerName',
      header: 'Customer',
      render: (prescription) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-slate-200">{prescription.customerName || 'N/A'}</div>
          {prescription.customerPhone && (
            <div className="text-sm text-slate-500 dark:text-slate-400">{prescription.customerPhone}</div>
          )}
        </div>
      ),
    },
    {
      key: 'odSphere',
      header: 'Right Eye (OD)',
      render: (prescription) => (
        <div className="text-sm text-slate-900 dark:text-slate-200">
          {prescription.odSphere !== null && prescription.odSphere !== undefined ? (
            <>
              S: {prescription.odSphere}
              {prescription.odCylinder && ` C: ${prescription.odCylinder}`}
              {prescription.odAxis && ` A: ${prescription.odAxis}°`}
              {prescription.odAdd && ` Add: ${prescription.odAdd}`}
            </>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">Not specified</span>
          )}
        </div>
      ),
    },
    {
      key: 'osSphere',
      header: 'Left Eye (OS)',
      render: (prescription) => (
        <div className="text-sm text-slate-900 dark:text-slate-200">
          {prescription.osSphere !== null && prescription.osSphere !== undefined ? (
            <>
              S: {prescription.osSphere}
              {prescription.osCylinder && ` C: ${prescription.osCylinder}`}
              {prescription.osAxis && ` A: ${prescription.osAxis}°`}
              {prescription.osAdd && ` Add: ${prescription.osAdd}`}
            </>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">Not specified</span>
          )}
        </div>
      ),
    },
    {
      key: 'pdDistance',
      header: 'PD',
      render: (prescription) => (
        <div className="text-sm text-slate-900 dark:text-slate-200">
          {prescription.pdDistance ? `Distance: ${prescription.pdDistance}mm` : 'N/A'}
          {prescription.pdNear && ` | Near: ${prescription.pdNear}mm`}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (prescription) => (
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {new Date(prescription.createdAt).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (prescription) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewingPrescription(prescription)}
        >
          <Eye size={16} className="mr-1" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Prescriptions (RX)</h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">Manage customer prescriptions</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto">
          <Plus size={20} className="mr-2" />
          Add Prescription
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
        </div>
      ) : prescriptions.length === 0 ? (
        <EmptyState
          icon={<FileText size={48} />}
          title="No Prescriptions"
          description="Start by adding a new prescription"
          action={{
            label: 'Add Prescription',
            onClick: () => setIsCreateOpen(true),
          }}
        />
      ) : (
        <DataTable data={prescriptions} columns={columns} />
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Prescription"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              Save Prescription
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Customer Name"
                value={formData.customerName || ''}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              />
              <Input
                label="Phone"
                type="tel"
                value={formData.customerPhone || ''}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              />
            </div>
          </div>

          {/* Right Eye (OD) */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Right Eye (OD - Oculus Dexter)</h3>
            <div className="grid grid-cols-4 gap-4">
              <Input
                label="Sphere (S)"
                type="number"
                step="0.25"
                value={formData.odSphere?.toString() || ''}
                onChange={(e) => setFormData({ ...formData, odSphere: parseFloat(e.target.value) || undefined })}
                placeholder="e.g., -2.50"
              />
              <Input
                label="Cylinder (C)"
                type="number"
                step="0.25"
                value={formData.odCylinder?.toString() || ''}
                onChange={(e) => setFormData({ ...formData, odCylinder: parseFloat(e.target.value) || undefined })}
                placeholder="e.g., -0.75"
              />
              <Input
                label="Axis"
                type="number"
                min="0"
                max="180"
                value={formData.odAxis?.toString() || ''}
                onChange={(e) => setFormData({ ...formData, odAxis: parseInt(e.target.value) || undefined })}
                placeholder="0-180"
              />
              <Input
                label="Add"
                type="number"
                step="0.25"
                value={formData.odAdd?.toString() || ''}
                onChange={(e) => setFormData({ ...formData, odAdd: parseFloat(e.target.value) || undefined })}
                placeholder="e.g., +2.00"
              />
            </div>
          </div>

          {/* Left Eye (OS) */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Left Eye (OS - Oculus Sinister)</h3>
            <div className="grid grid-cols-4 gap-4">
              <Input
                label="Sphere (S)"
                type="number"
                step="0.25"
                value={formData.osSphere?.toString() || ''}
                onChange={(e) => setFormData({ ...formData, osSphere: parseFloat(e.target.value) || undefined })}
                placeholder="e.g., -2.50"
              />
              <Input
                label="Cylinder (C)"
                type="number"
                step="0.25"
                value={formData.osCylinder?.toString() || ''}
                onChange={(e) => setFormData({ ...formData, osCylinder: parseFloat(e.target.value) || undefined })}
                placeholder="e.g., -0.75"
              />
              <Input
                label="Axis"
                type="number"
                min="0"
                max="180"
                value={formData.osAxis?.toString() || ''}
                onChange={(e) => setFormData({ ...formData, osAxis: parseInt(e.target.value) || undefined })}
                placeholder="0-180"
              />
              <Input
                label="Add"
                type="number"
                step="0.25"
                value={formData.osAdd?.toString() || ''}
                onChange={(e) => setFormData({ ...formData, osAdd: parseFloat(e.target.value) || undefined })}
                placeholder="e.g., +2.00"
              />
            </div>
          </div>

          {/* PD */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Pupillary Distance (PD)</h3>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Distance PD (mm)"
                type="number"
                step="0.5"
                value={formData.pdDistance?.toString() || ''}
                onChange={(e) => setFormData({ ...formData, pdDistance: parseFloat(e.target.value) || undefined })}
                placeholder="e.g., 64"
              />
              <Input
                label="Near PD (mm)"
                type="number"
                step="0.5"
                value={formData.pdNear?.toString() || ''}
                onChange={(e) => setFormData({ ...formData, pdNear: parseFloat(e.target.value) || undefined })}
                placeholder="e.g., 62"
              />
              <Input
                label="Single PD (mm)"
                type="number"
                step="0.5"
                value={formData.pdSingle?.toString() || ''}
                onChange={(e) => setFormData({ ...formData, pdSingle: parseFloat(e.target.value) || undefined })}
                placeholder="If same for both"
              />
            </div>
          </div>

          {/* Additional Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Additional Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Prescription Type"
                value={formData.prescriptionType || ''}
                onChange={(e) => setFormData({ ...formData, prescriptionType: e.target.value })}
                placeholder="e.g., Progressive, Bifocal"
              />
              <Input
                label="Doctor Name"
                value={formData.doctorName || ''}
                onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input
                label="Prescription Date"
                type="date"
                value={formData.prescriptionDate || ''}
                onChange={(e) => setFormData({ ...formData, prescriptionDate: e.target.value })}
              />
              <Input
                label="Doctor License"
                value={formData.doctorLicense || ''}
                onChange={(e) => setFormData({ ...formData, doctorLicense: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={!!viewingPrescription}
        onClose={() => setViewingPrescription(null)}
        title="Prescription Details"
        size="lg"
      >
        {viewingPrescription && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">Customer</h3>
              <p className="text-slate-900 dark:text-slate-200">{viewingPrescription.customerName || 'N/A'}</p>
              {viewingPrescription.customerPhone && (
                <p className="text-slate-600 dark:text-slate-400">{viewingPrescription.customerPhone}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">Right Eye (OD)</h3>
                <div className="space-y-1 text-sm text-slate-900 dark:text-slate-200">
                  <p>Sphere: {viewingPrescription.odSphere ?? 'N/A'}</p>
                  <p>Cylinder: {viewingPrescription.odCylinder ?? 'N/A'}</p>
                  <p>Axis: {viewingPrescription.odAxis ? `${viewingPrescription.odAxis}°` : 'N/A'}</p>
                  <p>Add: {viewingPrescription.odAdd ?? 'N/A'}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">Left Eye (OS)</h3>
                <div className="space-y-1 text-sm text-slate-900 dark:text-slate-200">
                  <p>Sphere: {viewingPrescription.osSphere ?? 'N/A'}</p>
                  <p>Cylinder: {viewingPrescription.osCylinder ?? 'N/A'}</p>
                  <p>Axis: {viewingPrescription.osAxis ? `${viewingPrescription.osAxis}°` : 'N/A'}</p>
                  <p>Add: {viewingPrescription.osAdd ?? 'N/A'}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">Pupillary Distance</h3>
              <div className="text-sm space-y-1 text-slate-900 dark:text-slate-200">
                <p>Distance: {viewingPrescription.pdDistance ? `${viewingPrescription.pdDistance}mm` : 'N/A'}</p>
                <p>Near: {viewingPrescription.pdNear ? `${viewingPrescription.pdNear}mm` : 'N/A'}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

