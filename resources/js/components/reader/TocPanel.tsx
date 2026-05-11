import { useTranslation } from 'react-i18next';
import type { NavItem } from 'epubjs';

interface TocPanelProps {
    toc: NavItem[];
    onNavigate: (href: string) => void;
    onClose: () => void;
}

function TocItem({ item, depth, onNavigate }: { item: NavItem; depth: number; onNavigate: (href: string) => void }) {
    return (
        <>
            <button
                onClick={() => onNavigate(item.href)}
                className="w-full text-left py-2 text-gray-300 hover:bg-gray-700 rounded transition-colors"
                style={{ paddingLeft: `${0.75 + depth * 1}rem`, paddingRight: '0.75rem' }}
            >
                <span className={depth > 0 ? 'text-sm text-gray-400' : ''}>
                    {item.label}
                </span>
            </button>
            {item.subitems?.map((sub, i) => (
                <TocItem key={i} item={sub} depth={depth + 1} onNavigate={onNavigate} />
            ))}
        </>
    );
}

/**
 * Table of contents panel for the EPUB reader
 *
 * Renders nested TOC items recursively (parts > chapters > sections)
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
                    <TocItem key={index} item={item} depth={0} onNavigate={handleItemClick} />
                ))}
            </div>
        </div>
    );
}
