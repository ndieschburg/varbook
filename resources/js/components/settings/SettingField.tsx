import { useTranslation } from 'react-i18next';
import type { Setting } from '@/types';

interface SettingFieldProps {
    setting: Setting;
    value: unknown;
    onChange: (value: unknown) => void;
    onReset?: () => void;
    showResetButton?: boolean;
    error?: string;
}

export function SettingField({
    setting,
    value,
    onChange,
    onReset,
    showResetButton = true,
    error,
}: SettingFieldProps) {
    const { t } = useTranslation();

    const renderInput = () => {
        switch (setting.type) {
            case 'text':
                return (
                    <input
                        type="text"
                        value={String(value ?? '')}
                        onChange={(e) => onChange(e.target.value)}
                        maxLength={setting.validation_rules?.maxlength}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                );

            case 'textarea':
                return (
                    <div>
                        <textarea
                            value={String(value ?? '')}
                            onChange={(e) => onChange(e.target.value)}
                            maxLength={setting.validation_rules?.maxlength}
                            rows={4}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
                        />
                        {setting.validation_rules?.maxlength && (
                            <p className="mt-1 text-xs text-slate-400 text-right">
                                {String(value ?? '').length} / {setting.validation_rules.maxlength}
                            </p>
                        )}
                    </div>
                );

            case 'number':
                return (
                    <div className="flex items-center gap-4">
                        <input
                            type="number"
                            value={Number(value ?? 0)}
                            onChange={(e) => onChange(parseFloat(e.target.value))}
                            min={setting.validation_rules?.min}
                            max={setting.validation_rules?.max}
                            step={setting.validation_rules?.step ?? 1}
                            className="w-32 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        {setting.validation_rules?.min !== undefined && setting.validation_rules?.max !== undefined && (
                            <input
                                type="range"
                                value={Number(value ?? 0)}
                                onChange={(e) => onChange(parseFloat(e.target.value))}
                                min={setting.validation_rules.min}
                                max={setting.validation_rules.max}
                                step={setting.validation_rules.step ?? 1}
                                className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        )}
                    </div>
                );

            case 'checkbox':
                return (
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={Boolean(value)}
                            onChange={(e) => onChange(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                );

            case 'select':
                return (
                    <select
                        value={String(value ?? '')}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        {setting.options?.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                );

            case 'multiselect':
                return (
                    <div className="flex flex-wrap gap-2">
                        {setting.options?.map((option) => {
                            const selectedValues = Array.isArray(value) ? value : [];
                            const isSelected = selectedValues.includes(option.value);
                            return (
                                <label
                                    key={option.value}
                                    className={`inline-flex items-center px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                                        isSelected
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                onChange([...selectedValues, option.value]);
                                            } else {
                                                onChange(selectedValues.filter((v: string) => v !== option.value));
                                            }
                                        }}
                                        className="sr-only"
                                    />
                                    {option.label}
                                </label>
                            );
                        })}
                    </div>
                );

            case 'color':
                return (
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            value={String(value ?? '#000000')}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-12 h-10 p-1 bg-slate-700 border border-slate-600 rounded-lg cursor-pointer"
                        />
                        <input
                            type="text"
                            value={String(value ?? '')}
                            onChange={(e) => onChange(e.target.value)}
                            pattern="^#[0-9A-Fa-f]{6}$"
                            placeholder="#000000"
                            className="w-28 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="py-4 border-b border-slate-700 last:border-b-0">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <label className="font-medium text-white">
                            {setting.label}
                        </label>
                        {setting.is_overridden && showResetButton && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-indigo-600/20 text-indigo-300 rounded">
                                {t('Customized')}
                            </span>
                        )}
                    </div>
                    {setting.description && (
                        <p className="mt-1 text-sm text-slate-400">
                            {setting.description}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {renderInput()}
                    {setting.is_overridden && showResetButton && onReset && (
                        <button
                            type="button"
                            onClick={onReset}
                            className="text-sm text-slate-400 hover:text-white transition-colors"
                            title={t('Reset to default')}
                        >
                            {t('Reset')}
                        </button>
                    )}
                </div>
            </div>
            {error && (
                <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
        </div>
    );
}
