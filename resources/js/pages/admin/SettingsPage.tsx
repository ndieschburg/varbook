import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAdminSettings, useUpdateAdminSetting } from '@/api/hooks';
import { LoadingSpinner } from '@/components/ui';
import { SettingField } from '@/components/settings/SettingField';
import { CogIcon, BookOpenIcon, LibraryIcon, PaletteIcon } from '@/components/icons';
import type { SettingsCategory } from '@/types';

// Map category icons
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    general: CogIcon,
    reader: BookOpenIcon,
    library: LibraryIcon,
    appearance: PaletteIcon,
    settings: CogIcon,
};

// Debounce helper
function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(
    callback: T,
    delay: number
) {
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

    return useCallback(
        (...args: Parameters<T>) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            const newTimeoutId = setTimeout(() => {
                callback(...args);
            }, delay);
            setTimeoutId(newTimeoutId);
        },
        [callback, delay, timeoutId]
    );
}

export function AdminSettingsPage() {
    const { t } = useTranslation();
    const { data, isLoading } = useAdminSettings();
    const updateSetting = useUpdateAdminSetting();

    const [activeTab, setActiveTab] = useState<string>('');
    const [localValues, setLocalValues] = useState<Record<string, unknown>>({});
    const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());

    // Initialize active tab when data loads
    useEffect(() => {
        if (data?.categories && data.categories.length > 0 && !activeTab) {
            setActiveTab(data.categories[0].key);
        }
    }, [data, activeTab]);

    // Initialize local values from server data
    useEffect(() => {
        if (data?.categories) {
            const values: Record<string, unknown> = {};
            data.categories.forEach((category) => {
                category.settings.forEach((setting) => {
                    values[setting.key] = setting.value;
                });
            });
            setLocalValues(values);
        }
    }, [data]);

    // Debounced save function
    const saveSettingDebounced = useDebouncedCallback(
        (key: string, value: unknown) => {
            updateSetting.mutate(
                { key, value },
                {
                    onSuccess: () => {
                        setPendingChanges((prev) => {
                            const next = new Set(prev);
                            next.delete(key);
                            return next;
                        });
                        toast.success(t('Setting saved'));
                    },
                    onError: () => {
                        toast.error(t('Failed to save setting'));
                        // Revert to server value
                        if (data) {
                            data.categories.forEach((category) => {
                                const setting = category.settings.find((s) => s.key === key);
                                if (setting) {
                                    setLocalValues((prev) => ({ ...prev, [key]: setting.value }));
                                }
                            });
                        }
                        setPendingChanges((prev) => {
                            const next = new Set(prev);
                            next.delete(key);
                            return next;
                        });
                    },
                }
            );
        },
        500
    );

    const handleChange = (key: string, value: unknown) => {
        setLocalValues((prev) => ({ ...prev, [key]: value }));
        setPendingChanges((prev) => new Set(prev).add(key));
        saveSettingDebounced(key, value);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!data?.categories || data.categories.length === 0) {
        return (
            <div className="text-center py-12 text-slate-400">
                {t('No settings available')}
            </div>
        );
    }

    const activeCategory = data.categories.find((c) => c.key === activeTab);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">{t('System Settings')}</h1>
                <p className="mt-1 text-slate-400">
                    {t('Configure default values for all users. Users can override these settings in their profile.')}
                </p>
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-4">
                {data.categories.map((category) => {
                    const IconComponent = categoryIcons[category.icon] || categoryIcons[category.key] || CogIcon;
                    return (
                        <button
                            key={category.key}
                            onClick={() => setActiveTab(category.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                activeTab === category.key
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                        >
                            <IconComponent className="h-5 w-5" />
                            <span>{category.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Settings List */}
            {activeCategory && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">
                        {activeCategory.label}
                    </h2>
                    <div className="divide-y divide-slate-700">
                        {activeCategory.settings.map((setting) => (
                            <div key={setting.key}>
                                <SettingField
                                    setting={setting}
                                    value={localValues[setting.key] ?? setting.value}
                                    onChange={(value) => handleChange(setting.key, value)}
                                    showResetButton={false}
                                />
                                {!setting.is_user_overridable && (
                                    <p className="text-xs text-amber-400 mt-1 mb-3">
                                        {t('This setting cannot be overridden by users')}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Saving indicator */}
            {pendingChanges.size > 0 && (
                <div className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg shadow-lg">
                    <LoadingSpinner size="sm" />
                    <span className="text-slate-300 text-sm">{t('Saving...')}</span>
                </div>
            )}
        </div>
    );
}
