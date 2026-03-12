import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';
import { UserIcon } from '@/components/icons';
import api from '@/api/client';

interface ProfileFormData {
    name: string;
    email: string;
    current_password: string;
    password: string;
    password_confirmation: string;
}

export function ProfilePage() {
    const { t } = useTranslation();
    const { user } = useAuth();

    const [formData, setFormData] = useState<ProfileFormData>({
        name: user?.name || '',
        email: user?.email || '',
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [isUpdating, setIsUpdating] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setIsUpdating(true);

        try {
            await api.put('/user/profile-information', {
                name: formData.name,
                email: formData.email,
            });
            toast.success(t('Profile updated successfully'));
        } catch (err: any) {
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            } else {
                toast.error(err.response?.data?.message || t('Failed to update profile'));
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setIsUpdatingPassword(true);

        try {
            await api.put('/user/password', {
                current_password: formData.current_password,
                password: formData.password,
                password_confirmation: formData.password_confirmation,
            });
            toast.success(t('Password updated successfully'));
            setFormData(prev => ({
                ...prev,
                current_password: '',
                password: '',
                password_confirmation: '',
            }));
        } catch (err: any) {
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            } else {
                toast.error(err.response?.data?.message || t('Failed to update password'));
            }
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Profile')}</h1>

            {/* User Info Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-4 bg-gray-100 dark:bg-slate-700 rounded-full">
                        <UserIcon className="h-8 w-8 text-gray-500 dark:text-slate-400" />
                    </div>
                    <div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                        <p className="text-gray-500 dark:text-slate-400">{user?.email}</p>
                        {user?.is_admin && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-600 text-white mt-1">
                                {t('Administrator')}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Update Profile Form */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('Update Profile')}</h2>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            {t('Name')}
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            required
                        />
                        {errors.name && (
                            <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.name[0]}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            {t('Email')}
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            required
                        />
                        {errors.email && (
                            <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.email[0]}</p>
                        )}
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" isLoading={isUpdating}>
                            {t('Save')}
                        </Button>
                    </div>
                </form>
            </div>

            {/* Update Password Form */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('Change Password')}</h2>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            {t('Current Password')}
                        </label>
                        <input
                            type="password"
                            value={formData.current_password}
                            onChange={(e) => setFormData(prev => ({ ...prev, current_password: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            required
                        />
                        {errors.current_password && (
                            <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.current_password[0]}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            {t('New Password')}
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            required
                        />
                        {errors.password && (
                            <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.password[0]}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            {t('Confirm Password')}
                        </label>
                        <input
                            type="password"
                            value={formData.password_confirmation}
                            onChange={(e) => setFormData(prev => ({ ...prev, password_confirmation: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" isLoading={isUpdatingPassword}>
                            {t('Update Password')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
