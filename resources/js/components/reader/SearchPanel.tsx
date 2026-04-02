import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '@/components/ui';
import type { SearchResult } from '@/hooks/useEpubReader';

interface SearchPanelProps {
    searchResults: SearchResult[];
    isSearching: boolean;
    onSearch: (query: string) => void;
    onResultClick: (result: SearchResult) => void;
    onClose: () => void;
}

/**
 * Search panel for the EPUB reader
 */
export function SearchPanel({
    searchResults,
    isSearching,
    onSearch,
    onResultClick,
    onClose,
}: SearchPanelProps) {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = () => {
        if (searchQuery.trim()) {
            onSearch(searchQuery);
        }
    };

    const handleResultClick = (result: SearchResult) => {
        onResultClick(result);
        onClose();
    };

    return (
        <div className="absolute left-0 top-0 bottom-0 w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto z-20">
            <div className="p-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white mb-3">{t('Search')}</h2>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleSearch();
                            }
                        }}
                        placeholder={t('Search in book...')}
                        className="flex-1 bg-gray-700 border-gray-600 rounded text-white placeholder-gray-400 text-sm px-3 py-2"
                        autoFocus
                    />
                    <button
                        onClick={handleSearch}
                        disabled={isSearching || !searchQuery.trim()}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded text-sm"
                    >
                        {isSearching ? '...' : t('Go')}
                    </button>
                </div>
            </div>
            <div className="p-2">
                {isSearching && (
                    <div className="text-center py-8 text-gray-400">
                        <LoadingSpinner size="sm" />
                        <p className="mt-2 text-sm">{t('Searching...')}</p>
                    </div>
                )}
                {!isSearching && searchResults.length === 0 && searchQuery && (
                    <p className="text-center py-8 text-gray-400 text-sm">
                        {t('No results found')}
                    </p>
                )}
                {!isSearching && searchResults.length > 0 && (
                    <>
                        <p className="text-xs text-gray-400 px-3 py-2">
                            {searchResults.length} {t('results')}
                        </p>
                        {searchResults.map((result, index) => (
                            <button
                                key={index}
                                onClick={() => handleResultClick(result)}
                                className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-700 rounded transition-colors text-sm"
                            >
                                <span
                                    dangerouslySetInnerHTML={{
                                        __html: result.excerpt.replace(
                                            new RegExp(`(${searchQuery})`, 'gi'),
                                            '<mark class="bg-yellow-500/30 text-yellow-200">$1</mark>'
                                        ),
                                    }}
                                />
                            </button>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
