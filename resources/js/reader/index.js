import ePub from 'epubjs';
import EpubReader from './EpubReader';
import PositionSync from './PositionSync';
import ThemeManager from './ThemeManager';

// Export for global access
window.BookshelfReader = {
    init: (options) => {
        const reader = new EpubReader(options);
        return reader;
    },
    ePub,
};

export { EpubReader, PositionSync, ThemeManager };
export default EpubReader;
