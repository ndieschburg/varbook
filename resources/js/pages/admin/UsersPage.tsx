import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAdminUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/api/hooks';
import { LoadingSpinner, Button, ConfirmModal } from '@/components/ui';
import { UserIcon, PlusIcon } from '@/components/icons';
import type { User } from '@/types';

interface UserFormData {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    is_admin: boolean;
}

const initialFormData: UserFormData = {
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    is_admin: false,
};

export function UsersPage() {
    const { t } = useTranslation();
    const { data, isLoading } = useAdminUsers();
    const createMutation = useCreateUser();
    const updateMutation = useUpdateUser();
    const deleteMutation = useDeleteUser();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<UserFormData>(initialFormData);
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    const resetForm = () => {
        setFormData(initialFormData);
        setErrors({});
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        try {
            await createMutation.mutateAsync(formData);
            toast.success(t('User created successfully'));
            setShowCreateModal(false);
            resetForm();
        } catch (err: any) {
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            } else {
                toast.error(err.response?.data?.message || 'Error');
            }
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setErrors({});

        try {
            await updateMutation.mutateAsync({
                id: editingUser.id,
                data: {
                    name: formData.name,
                    email: formData.email,
                    password: formData.password || undefined,
                    password_confirmation: formData.password_confirmation || undefined,
                    is_admin: formData.is_admin,
                },
            });
            toast.success(t('User updated successfully'));
            setEditingUser(null);
            resetForm();
        } catch (err: any) {
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            } else {
                toast.error(err.response?.data?.message || 'Error');
            }
        }
    };

    const handleDelete = async () => {
        if (!deletingUser) return;

        try {
            await deleteMutation.mutateAsync(deletingUser.id);
            toast.success(t('User deleted successfully'));
            setDeletingUser(null);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Error');
        }
    };

    const openEditModal = (user: User) => {
        setFormData({
            name: user.name,
            email: user.email,
            password: '',
            password_confirmation: '',
            is_admin: user.is_admin,
        });
        setEditingUser(user);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    const users = data?.data || [];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">{t('Users Management')}</h1>
                <Button onClick={() => setShowCreateModal(true)}>
                    <PlusIcon className="h-5 w-5 mr-2" />
                    {t('Create User')}
                </Button>
            </div>

            {/* Users Table */}
            {users.length > 0 ? (
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-700">
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    {t('User')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    {t('Books')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    {t('Role')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    {t('Created')}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    {t('Actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-slate-600 flex items-center justify-center">
                                                <UserIcon className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-slate-100">
                                                    {user.name}
                                                </div>
                                                <div className="text-sm text-slate-400">
                                                    {user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                        {user.books_count || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {user.is_admin ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-600 text-white">
                                                {t('Administrator')}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-600 text-slate-300">
                                                {t('User')}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <button
                                            onClick={() => openEditModal(user)}
                                            className="text-indigo-400 hover:text-indigo-300 mr-4"
                                        >
                                            {t('Edit')}
                                        </button>
                                        <button
                                            onClick={() => setDeletingUser(user)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            {t('Delete')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
                    <UserIcon className="mx-auto h-12 w-12 text-slate-600" />
                    <h3 className="mt-4 text-sm font-medium text-slate-300">
                        {t('No users yet')}
                    </h3>
                </div>
            )}

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center p-4">
                        <div className="fixed inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
                        <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">{t('Create User')}</h3>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300">{t('Name')}</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
                                        required
                                    />
                                    {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name[0]}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300">{t('Email')}</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
                                        required
                                    />
                                    {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email[0]}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300">{t('Password')}</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
                                        required
                                    />
                                    {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password[0]}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300">{t('Password')} (confirm)</label>
                                    <input
                                        type="password"
                                        value={formData.password_confirmation}
                                        onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                                        className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
                                        required
                                    />
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_admin}
                                        onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                                        className="rounded bg-gray-700 border-gray-600 text-indigo-600"
                                    />
                                    <label className="ml-2 text-sm text-gray-300">{t('Administrator')}</label>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <Button variant="ghost" type="button" onClick={() => { setShowCreateModal(false); resetForm(); }}>
                                        {t('Cancel')}
                                    </Button>
                                    <Button type="submit" isLoading={createMutation.isPending}>
                                        {t('Create')}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center p-4">
                        <div className="fixed inset-0 bg-black/50" onClick={() => { setEditingUser(null); resetForm(); }} />
                        <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">{t('Edit User')}</h3>
                            <form onSubmit={handleUpdate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300">{t('Name')}</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
                                        required
                                    />
                                    {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name[0]}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300">{t('Email')}</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
                                        required
                                    />
                                    {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email[0]}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300">
                                        {t('Password')} <span className="text-gray-500">{t('(leave blank to keep current)')}</span>
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300">{t('Password')} (confirm)</label>
                                    <input
                                        type="password"
                                        value={formData.password_confirmation}
                                        onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                                        className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
                                    />
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_admin}
                                        onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                                        className="rounded bg-gray-700 border-gray-600 text-indigo-600"
                                    />
                                    <label className="ml-2 text-sm text-gray-300">{t('Administrator')}</label>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <Button variant="ghost" type="button" onClick={() => { setEditingUser(null); resetForm(); }}>
                                        {t('Cancel')}
                                    </Button>
                                    <Button type="submit" isLoading={updateMutation.isPending}>
                                        {t('Update')}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={!!deletingUser}
                onClose={() => setDeletingUser(null)}
                onConfirm={handleDelete}
                title={t('Delete User')}
                message={
                    <>
                        <p>{t('Are you sure you want to delete this user?')}</p>
                        <p className="mt-2 text-sm text-slate-400">
                            {t('This action cannot be undone. All books and reading data will be permanently deleted.')}
                        </p>
                    </>
                }
                confirmText={t('Delete')}
                cancelText={t('Cancel')}
                isLoading={deleteMutation.isPending}
                variant="danger"
            />
        </div>
    );
}
