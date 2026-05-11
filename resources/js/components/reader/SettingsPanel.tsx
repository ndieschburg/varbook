import { useTranslation } from 'react-i18next';
import type { Theme, FontFamily, Margins } from '@/hooks/useReaderSettings';

interface ReaderSettings {
    theme: Theme;
    fontSize: number;
    fontFamily: FontFamily;
    lineHeight: number;
    margins: Margins;
    textSelection: boolean;
    fullscreenLock: boolean;
}

interface SettingsPanelProps {
    settings: ReaderSettings;
    isIOS: boolean;
    onThemeChange: (theme: Theme) => void;
    onFontSizeChange: (size: number) => void;
    onFontFamilyChange: (family: FontFamily) => void;
    onLineHeightChange: (height: number) => void;
    onMarginsChange: (margins: Margins) => void;
    onTextSelectionChange: (enabled: boolean) => void;
    onFullscreenLockChange: (enabled: boolean) => void;
}

/**
 * Settings panel for the EPUB reader
 */
export function SettingsPanel({
    settings,
    isIOS,
    onThemeChange,
    onFontSizeChange,
    onFontFamilyChange,
    onLineHeightChange,
    onMarginsChange,
    onTextSelectionChange,
    onFullscreenLockChange,
}: SettingsPanelProps) {
    const { t } = useTranslation();

    const themes: Theme[] = ['light', 'dark', 'sepia'];
    const fonts: { key: FontFamily; label: string }[] = [
        { key: 'epub', label: t('Book default') },
        { key: 'default', label: t('System') },
        { key: 'literata', label: 'Literata' },
        { key: 'lora', label: 'Lora' },
        { key: 'merriweather', label: 'Merriweather' },
        { key: 'garamond', label: 'EB Garamond' },
        { key: 'crimson', label: 'Crimson Pro' },
        { key: 'inter', label: 'Inter' },
        { key: 'opensans', label: 'Open Sans' },
        { key: 'atkinson', label: 'Atkinson' },
        { key: 'dyslexic', label: 'Dyslexic' },
    ];
    const marginOptions: Margins[] = ['compact', 'normal', 'wide'];

    return (
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto z-20">
            <div className="p-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white">{t('Settings')}</h2>
            </div>
            <div className="p-4 space-y-6">
                {/* Theme */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('Theme')}</label>
                    <div className="flex gap-2">
                        {themes.map(theme => (
                            <button
                                key={theme}
                                onClick={() => onThemeChange(theme)}
                                className={`flex-1 py-2 rounded border ${
                                    settings.theme === theme
                                        ? 'border-indigo-500 bg-indigo-600/20'
                                        : 'border-gray-600 hover:border-gray-500'
                                }`}
                            >
                                <span className="text-gray-300 text-sm capitalize">
                                    {t(theme.charAt(0).toUpperCase() + theme.slice(1))}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Font Size */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('Font Size')}</label>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => onFontSizeChange(settings.fontSize - 10)}
                            className="w-10 h-10 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
                        >
                            -
                        </button>
                        <span className="flex-1 text-center text-gray-300">{settings.fontSize}%</span>
                        <button
                            onClick={() => onFontSizeChange(settings.fontSize + 10)}
                            className="w-10 h-10 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* Font Family */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('Font')}</label>
                    <div className="grid grid-cols-2 gap-2">
                        {fonts.map(font => (
                            <button
                                key={font.key}
                                onClick={() => onFontFamilyChange(font.key)}
                                className={`py-2 px-3 rounded border text-sm ${
                                    settings.fontFamily === font.key
                                        ? 'border-indigo-500 bg-indigo-600/20 text-white'
                                        : 'border-gray-600 text-gray-300 hover:border-gray-500'
                                }`}
                            >
                                {font.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Line Height */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('Line Height')}</label>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => onLineHeightChange(settings.lineHeight - 0.1)}
                            className="w-10 h-10 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
                        >
                            -
                        </button>
                        <span className="flex-1 text-center text-gray-300">{settings.lineHeight.toFixed(1)}</span>
                        <button
                            onClick={() => onLineHeightChange(settings.lineHeight + 0.1)}
                            className="w-10 h-10 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* Margins */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('Margins')}</label>
                    <div className="flex gap-2">
                        {marginOptions.map(margin => (
                            <button
                                key={margin}
                                onClick={() => onMarginsChange(margin)}
                                className={`flex-1 py-2 rounded border text-sm ${
                                    settings.margins === margin
                                        ? 'border-indigo-500 bg-indigo-600/20 text-white'
                                        : 'border-gray-600 text-gray-300 hover:border-gray-500'
                                }`}
                            >
                                {t(margin.charAt(0).toUpperCase() + margin.slice(1))}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Text Selection */}
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">{t('Text Selection')}</label>
                    <button
                        onClick={() => onTextSelectionChange(!settings.textSelection)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.textSelection ? 'bg-indigo-600' : 'bg-gray-600'
                        }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings.textSelection ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                    </button>
                </div>

                {/* Fullscreen & Orientation Lock (Android only - not supported on iOS) */}
                {!isIOS && (
                    <div className="pt-4 border-t border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-gray-300">{t('Fullscreen Lock')}</label>
                                <p className="text-xs text-gray-400 mt-1">
                                    {t('Lock portrait orientation in fullscreen')}
                                </p>
                            </div>
                            <button
                                onClick={() => onFullscreenLockChange(!settings.fullscreenLock)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    settings.fullscreenLock ? 'bg-indigo-600' : 'bg-gray-600'
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        settings.fullscreenLock ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
