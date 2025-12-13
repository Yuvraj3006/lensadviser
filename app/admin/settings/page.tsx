'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { DataTable, Column } from '@/components/data-display/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Settings, Save, Power, ToggleLeft, ToggleRight } from 'lucide-react';

interface ConfigItem {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const { showToast } = useToast();
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ConfigItem | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch('/api/admin/config', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setConfigs(data.data);
      } else {
        showToast('error', 'Failed to load settings');
      }
    } catch (error) {
      console.error('Failed to fetch configs:', error);
      showToast('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config: ConfigItem) => {
    setEditingConfig(config);
    setEditValue(config.value);
  };

  const handleSave = async () => {
    if (!editingConfig) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/config/${editingConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          value: editValue,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', 'Setting updated successfully');
        setEditingConfig(null);
        fetchConfigs();
      } else {
        showToast('error', data.error?.message || 'Failed to update setting');
      }
    } catch (error) {
      console.error('Failed to update config:', error);
      showToast('error', 'Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  const toggleComboStatus = async () => {
    const comboConfig = configs.find(c => c.key === 'combo_offer_status');
    if (!comboConfig) return;

    const newValue = comboConfig.value === 'ON' ? 'OFF' : 'ON';
    setEditValue(newValue);
    setEditingConfig(comboConfig);
    await handleSave();
  };

  const columns: Column<ConfigItem>[] = [
    {
      key: 'key',
      header: 'Setting Key',
      render: (config: ConfigItem) => (
        <div className="flex items-center gap-2">
          {config.key === 'combo_offer_status' && <Power size={16} className="text-purple-500" />}
          <span className="font-medium">{config.key}</span>
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      render: (config: ConfigItem) => {
        if (config.key === 'combo_offer_status') {
          const isOn = config.value === 'ON';
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleComboStatus()}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors ${
                  isOn
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isOn ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                <span className="font-semibold">{config.value}</span>
              </button>
            </div>
          );
        }
        return <span className="text-slate-600">{config.value}</span>;
      },
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      render: (config: ConfigItem) => (
        <span className="text-sm text-slate-500">
          {new Date(config.updatedAt).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Manage system configuration and feature flags</p>
        </div>
      </div>

      {/* Master Switch Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Power className="text-purple-500" size={24} />
              Combo Offer Master Switch
            </h2>
            <p className="text-slate-600 mt-1">
              Turn combo offers ON/OFF globally. When OFF, combo option is hidden from customers.
            </p>
          </div>
          {configs.find(c => c.key === 'combo_offer_status') && (
            <Button
              onClick={toggleComboStatus}
              variant={configs.find(c => c.key === 'combo_offer_status')?.value === 'ON' ? 'primary' : 'outline'}
              className={configs.find(c => c.key === 'combo_offer_status')?.value === 'ON' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {configs.find(c => c.key === 'combo_offer_status')?.value === 'ON' ? (
                <>
                  <ToggleRight size={20} className="mr-2" />
                  Turn OFF
                </>
              ) : (
                <>
                  <ToggleLeft size={20} className="mr-2" />
                  Turn ON
                </>
              )}
            </Button>
          )}
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="font-medium text-slate-900">Current Status</div>
              <div className="text-sm text-slate-600 mt-1">
                {configs.find(c => c.key === 'combo_offer_status')?.value === 'ON' ? (
                  <span className="text-green-700 font-semibold">✅ Combo Offers are ENABLED</span>
                ) : (
                  <span className="text-gray-700 font-semibold">❌ Combo Offers are DISABLED</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All Settings Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">All Settings</h2>
        </div>
        <DataTable
          columns={columns}
          data={configs}
          loading={loading}
          rowActions={(config) => (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleEdit(config)}
            >
              Edit
            </Button>
          )}
        />
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingConfig}
        onClose={() => setEditingConfig(null)}
        title={`Edit Setting: ${editingConfig?.key}`}
        size="md"
      >
        {editingConfig && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Value
              </label>
              {editingConfig.key === 'combo_offer_status' ? (
                <Select
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  options={[
                    { value: 'ON', label: 'ON - Combo offers enabled' },
                    { value: 'OFF', label: 'OFF - Combo offers disabled' },
                  ]}
                />
              ) : (
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Enter value"
                />
              )}
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setEditingConfig(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                loading={saving}
                icon={<Save size={16} />}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

