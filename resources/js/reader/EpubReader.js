import ePub from 'epubjs';
import PositionSync from './PositionSync';
import ThemeManager from './ThemeManager';

class EpubReader {
    constructor(options) {
        this.bookId = options.bookId;
        this.epubUrl = options.epubUrl;
        this.container = options.container || '#reader-container';
        this.apiBaseUrl = options.apiBaseUrl || '/api/books';

        this.book = null;
        this.rendition = null;
        this.currentProgress = 0;
        this.positionSync = new PositionSync(this);
        this.themeManager = new ThemeManager(this);

        this.init();
    }

    async init() {
        // Create book instance
        this.book = ePub(this.epubUrl);

        // Render to container
        this.rendition = this.book.renderTo(this.container, {
            width: '100%',
            height: '100%',
            spread: 'none',
            flow: 'paginated',
        });

        // Generate locations for progress tracking
        this.book.ready.then(() => {
            return this.book.locations.generate(1024);
        });

        // Apply saved theme
        this.themeManager.applyTheme();

        // Load saved position or start from beginning
        const savedPosition = await this.positionSync.load();
        if (savedPosition?.cfi) {
            this.rendition.display(savedPosition.cfi);
        } else {
            this.rendition.display();
        }

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Track location changes for progress sync
        this.rendition.on('relocated', (location) => {
            if (this.book.locations.length() > 0) {
                this.currentProgress = this.book.locations.percentageFromCfi(location.start.cfi) * 100;
            } else {
                // Fallback if locations not ready
                this.currentProgress = location.start.percentage * 100;
            }
            this.positionSync.save(location.start.cfi, this.currentProgress);
            this.updateProgressUI(this.currentProgress);
        });

        // Keyboard navigation
        this.rendition.on('keydown', (e) => {
            this.handleKeydown(e);
        });

        document.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });
    }

    handleKeydown(e) {
        if (e.key === 'ArrowRight' || e.key === ' ') {
            e.preventDefault();
            this.nextPage();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.prevPage();
        }
    }

    nextPage() {
        this.rendition.next();
    }

    prevPage() {
        this.rendition.prev();
    }

    goTo(href) {
        this.rendition.display(href);
    }

    updateProgressUI(progress) {
        const progressBar = document.querySelector('#reader-progress-bar');
        const progressText = document.querySelector('#reader-progress-text');

        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `${progress.toFixed(1)}%`;
    }

    async getToc() {
        const navigation = await this.book.loaded.navigation;
        return navigation.toc;
    }

    destroy() {
        this.positionSync.flushSync();
        if (this.book) {
            this.book.destroy();
        }
    }
}

export default EpubReader;
