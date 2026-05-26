import { useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { NavItem } from 'epubjs';

interface TocPanelProps {
    toc: NavItem[];
    currentChapter: string;
    onNavigate: (href: string) => void;
    onClose: () => void;
}

interface TocItemProps {
    item: NavItem;
    depth: number;
    currentChapter: string;
    onNavigate: (href: string) => void;
    activeRef: (el: HTMLButtonElement | null) => void;
}

function TocItem({ item, depth, currentChapter, onNavigate, activeRef }: TocItemProps) {
    const isActive = item.label.trim() === currentChapter;

    return (
        <>
            <button
                ref={isActive ? activeRef : undefined}
                onClick={() => onNavigate(item.href)}
                className={`w-full text-left py-2 rounded transition-colors ${
                    isActive
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'text-gray-300 hover:bg-gray-700'
                }`}
                style={{ paddingLeft: `${0.75 + depth * 1}rem`, paddingRight: '0.75rem' }}
            >
                <span className={depth > 0 && !isActive ? 'text-sm text-gray-400' : depth > 0 ? 'text-sm' : ''}>
                    {item.label}
                </span>
            </button>
            {item.subitems?.map((sub, i) => (
                <TocItem key={i} item={sub} depth={depth + 1} currentChapter={currentChapter} onNavigate={onNavigate} activeRef={activeRef} />
            ))}
        </>
    );
}

/**
 * Table of contents panel for the EPUB reader
 *
 * Renders nested TOC items recursively (parts > chapters > sections).
 * Auto-scrolls to and highlights the current chapter on open.
 */
export function TocPanel({ toc, currentChapter, onNavigate, onClose }: TocPanelProps) {
    const { t } = useTranslation();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const activeRef = useCallback((el: HTMLButtonElement | null) => {
        if (el) {
            // Delay to let the panel render before scrolling
            requestAnimationFrame(() => {
                el.scrollIntoView({ block: 'center', behavior: 'instant' });
            });
        }
    }, []);

    const handleItemClick = (href: string) => {
        onNavigate(href);
        onClose();
    };

    return (
        <div ref={scrollContainerRef} className="absolute left-0 top-0 bottom-0 w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto z-20">
            <div className="p-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white">{t('Table of Contents')}</h2>
            </div>
            <div className="p-2">
                {toc.map((item, index) => (
                    <TocItem key={index} item={item} depth={0} currentChapter={currentChapter} onNavigate={handleItemClick} activeRef={activeRef} />
                ))}
            </div>
        </div>
    );
}
