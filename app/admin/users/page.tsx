'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { DataTable, Column } from '@/components/data-display/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Plus, Search, Edit2, Trash2, Users as UsersIcon, RotateCcw } from 'lucide-react';
import { UserRole } from '@/lib/constants';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  employeeId?: string;
  phone?: string;
  storeId?: string | null;
  storeName?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface UserFormData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  storeId: string;
  employeeId: string;
  phone: string;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    name: '',
    role: UserRole.SALES_EXECUTIVE,
    storeId: '',
    employeeId: '',
    phone: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchStores();
  }, [search, roleFilter, showDeactivated]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lenstrack_token');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      // Filter by active/deactivated status
      params.append('isActive', showDeactivated ? 'false' : 'true');

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch('/api/admin/stores', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setStores(data.data);
      }
    } catch (error) {
      console.error('Failed to load stores');
    }
  };

  const getAvailableRoles = (): UserRole[] => {
    if (currentUser?.role === UserRole.SUPER_ADMIN) {
      return [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_MANAGER, UserRole.SALES_EXECUTIVE];
    } else if (currentUser?.role === UserRole.ADMIN) {
      return [UserRole.ADMIN, UserRole.STORE_MANAGER, UserRole.SALES_EXECUTIVE];
    } else if (currentUser?.role === UserRole.STORE_MANAGER) {
      return [UserRole.SALES_EXECUTIVE];
    }
    return [];
  };

  const handleCreate = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      role: UserRole.SALES_EXECUTIVE,
      storeId: currentUser?.storeId || '',
      employeeId: '',
      phone: '',
    });
    setEditingUser(null);
    setIsCreateOpen(true);
  };

  const handleEdit = (user: User) => {
    setFormData({
      email: user.email,
      password: '',
      name: user.name,
      role: user.role,
      storeId: user.storeId || '',
      employeeId: user.employeeId || '',
      phone: user.phone || '',
    });
    setEditingUser(user);
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('lenstrack_token');
      const url = editingUser
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';

      // Don't send empty password on update
      const payload: any = { ...formData };
      if (editingUser && !payload.password) {
        delete payload.password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        showToast('success', `User ${editingUser ? 'updated' : 'created'} successfully`);
        setIsCreateOpen(false);
        fetchUsers();
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
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/users/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        showToast('success', 'User deactivated successfully');
        setDeleteConfirm(null);
        fetchUsers();
      } else {
        showToast('error', data.error?.message || 'Failed to delete user');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    }
  };

  const handleReactivate = async (user: User) => {
    try {
      const token = localStorage.getItem('lenstrack_token');
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        showToast('success', 'User reactivated successfully');
        fetchUsers();
      } else {
        showToast('error', data.error?.message || 'Failed to reactivate user');
      }
    } catch (error) {
      showToast('error', 'An error occurred');
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return 'purple';
      case UserRole.ADMIN:
        return 'blue';
      case UserRole.STORE_MANAGER:
        return 'green';
      case UserRole.SALES_EXECUTIVE:
        return 'gray';
      default:
        return 'gray';
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (user) => (
        <div>
          <p className="font-medium">{user.name}</p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user) => (
        <Badge color={getRoleBadgeColor(user.role)}>
          {user.role.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'storeName',
      header: 'Store',
      render: (user) => (
        <span className="text-sm">{user.storeName || '-'}</span>
      ),
    },
    {
      key: 'employeeId',
      header: 'Employee ID',
      render: (user) => (
        <span className="text-sm font-mono">{user.employeeId || '-'}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (user) => (
        <span className="text-sm">{user.phone || '-'}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (user) => (
        <Badge color={user.isActive ? 'green' : 'red'}>
          {user.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  const roleOptions = getAvailableRoles().map((role) => ({
    value: role,
    label: role.replace('_', ' '),
  }));

  const storeOptions = stores.map((store) => ({
    value: store.id,
    label: store.name,
  }));

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Users</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Manage staff members and access</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button
            variant={showDeactivated ? 'outline' : 'primary'}
            onClick={() => setShowDeactivated(!showDeactivated)}
            className="w-full sm:w-auto"
          >
            {showDeactivated ? 'Show Active Users' : 'Show Deactivated Users'}
          </Button>
          {!showDeactivated && (
            <Button icon={<Plus size={18} />} onClick={handleCreate} className="w-full sm:w-auto">
              Add User
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2">
          <Input
            placeholder="Search by name, email, or employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={18} />}
          />
        </div>
        <Select
          placeholder="Filter by role"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          options={[
            { value: '', label: 'All Roles' },
            ...roleOptions,
          ]}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {users.length === 0 && !loading ? (
          <EmptyState
            icon={<UsersIcon size={48} />}
            title={showDeactivated ? 'No deactivated users found' : 'No users found'}
            description={showDeactivated ? 'There are no deactivated users' : 'Get started by creating your first user'}
            action={!showDeactivated ? {
              label: 'Add User',
              onClick: handleCreate,
            } : undefined}
          />
        ) : (
          <DataTable
            columns={columns}
            data={users}
            loading={loading}
            rowActions={(user) => (
              <div className="flex items-center gap-2">
                {showDeactivated ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<RotateCcw size={14} />}
                    onClick={() => handleReactivate(user)}
                  >
                    Reactivate
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Edit2 size={14} />}
                      onClick={() => handleEdit(user)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 size={14} />}
                      onClick={() => setDeleteConfirm(user)}
                      disabled={user.id === currentUser?.id}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            )}
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={editingUser ? 'Edit User' : 'Create User'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <Input
            label="Password"
            type="password"
            placeholder={editingUser ? 'Leave blank to keep current password' : 'Enter password'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required={!editingUser}
            hint={editingUser ? 'Leave blank to keep current password' : 'Minimum 8 characters, 1 uppercase, 1 number'}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              options={roleOptions}
              required
            />
            <Select
              label="Store"
              value={formData.storeId}
              onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
              options={[
                { value: '', label: 'No Store (Admin)' },
                ...storeOptions,
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Employee ID"
              placeholder="EMP-001"
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
            />
            <Input
              label="Phone"
              type="tel"
              placeholder="+91-9876543210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Deactivate User"
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
        <p className="text-slate-600">
          Are you sure you want to deactivate <strong>{deleteConfirm?.name}</strong>?
          This will not delete the user but will prevent them from logging in.
        </p>
      </Modal>
    </div>
  );
}

