import { useTranslation } from 'react-i18next';
import type { NavItem } from 'epubjs';

interface TocPanelProps {
    toc: NavItem[];
    onNavigate: (href: string) => void;
    onClose: () => void;
}

/**
 * Table of contents panel for the EPUB reader
 */
export function TocPanel({ toc, onNavigate, onClose }: TocPanelProps) {
    const { t } = useTranslation();

    const handleItemClick = (href: string) => {
        onNavigate(href);
        onClose();
    };

    return (
        <div className="absolute left-0 top-0 bottom-0 w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto z-20">
            <div className="p-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white">{t('Table of Contents')}</h2>
            </div>
            <div className="p-2">
                {toc.map((item, index) => (
                    <button
                        key={index}
                        onClick={() => handleItemClick(item.href)}
                        className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-700 rounded transition-colors"
                    >
                        {item.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
