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
        try {
            // Get container element
            const containerEl = document.querySelector(this.container);
            if (!containerEl) {
                throw new Error(`Container element not found: ${this.container}`);
            }

            // Fetch EPUB as ArrayBuffer to avoid relative URL issues
            const response = await fetch(this.epubUrl);
            if (!response.ok) {
                throw new Error(`Failed to load EPUB: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();

            // Create book instance from ArrayBuffer
            this.book = ePub(arrayBuffer);

            // Render to container element
            this.rendition = this.book.renderTo(containerEl, {
                width: '100%',
                height: '100%',
                spread: 'none',
                flow: 'paginated',
                allowScriptedContent: true,
            });

            // Generate locations for progress tracking
            this.book.ready.then(() => {
                return this.book.locations.generate(1024);
            });

            // Apply saved theme and typography
            this.themeManager.applyTheme();
            this.themeManager.applyTypography();

            // Load saved position or start from beginning
            const savedPosition = await this.positionSync.load();
            if (savedPosition?.cfi) {
                this.rendition.display(savedPosition.cfi);
            } else {
                this.rendition.display();
            }

            // Setup event listeners
            this.setupEventListeners();

            // Hide loading overlay
            document.querySelector('#reader-loading')?.classList.add('hidden');
        } catch (error) {
            console.error('Failed to initialize EPUB reader:', error);
            document.querySelector('#reader-loading').innerHTML = `
                <div class="text-center text-red-400">
                    <p>Failed to load book</p>
                    <p class="text-sm mt-2">${error.message}</p>
                </div>
            `;
        }
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
