import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';

const ROLE_OPTIONS = [
  { value: 'patient', label: 'Patient' },
  { value: 'worker', label: 'Health Worker' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'hospital_admin', label: 'Hospital Admin' },
  { value: 'system_admin', label: 'System Admin' },
];

const ROLE_COLORS = {
  patient: 'bg-emerald-50 text-emerald-700',
  worker: 'bg-blue-50 text-blue-700',
  doctor: 'bg-purple-50 text-purple-700',
  hospital_admin: 'bg-amber-50 text-amber-700',
  system_admin: 'bg-red-50 text-red-700',
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'patient', phone: '' });

  const fetchUsers = async () => {
    try {
      const res = await adminService.getUsers();
      setUsers(res || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = users.filter(u => {
    const matchesSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await adminService.createUser(formData);
      toast.success('User created successfully');
      setShowCreateModal(false);
      setFormData({ name: '', email: '', password: '', role: 'patient', phone: '' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await adminService.updateUser(editingUser._id, formData);
      toast.success('User updated successfully');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    try {
      await adminService.deleteUser(userId);
      toast.success('User deactivated');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to deactivate user');
    }
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, password: '', role: user.role, phone: user.phone || '' });
  };

  if (loading) return <LoadingSpinner message="Loading users..." />;

  const UserForm = ({ onSubmit, submitLabel }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
        <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Password {editingUser && '(leave blank to keep current)'}</label>
        <input type="password" required={!editingUser} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
        <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="input-field">
          {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
        <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="input-field" />
      </div>
      <button type="submit" className="btn-primary w-full">{submitLabel}</button>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500">{users.length} total users</p>
        </div>
        <button onClick={() => { setFormData({ name: '', email: '', password: '', role: 'patient', phone: '' }); setShowCreateModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create User
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input-field w-full sm:w-48">
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-500">No users found</td></tr>
              ) : filteredUsers.map(user => (
                <tr key={user._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] || 'bg-slate-100 text-slate-700'}`}>
                      {user.role?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {user.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(user)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-teal-600">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(user._id)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New User">
        <UserForm onSubmit={handleCreate} submitLabel="Create User" />
      </Modal>

      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Edit User">
        <UserForm onSubmit={handleUpdate} submitLabel="Update User" />
      </Modal>
    </div>
  );
}
