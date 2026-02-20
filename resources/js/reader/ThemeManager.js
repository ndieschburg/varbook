class ThemeManager {
    constructor(reader) {
        this.reader = reader;
        this.currentTheme = localStorage.getItem('reader-theme') || 'dark';
        this.fontSize = parseInt(localStorage.getItem('reader-font-size')) || 100;
        this.fontFamily = localStorage.getItem('reader-font-family') || 'default';
        this.lineHeight = parseFloat(localStorage.getItem('reader-line-height')) || 1.5;
        this.margins = localStorage.getItem('reader-margins') || 'normal';
        this.flowMode = localStorage.getItem('reader-flow') || 'paginated';

        this.themes = {
            light: {
                body: { background: '#ffffff', color: '#1a1a1a' },
            },
            dark: {
                body: { background: '#1e293b', color: '#e2e8f0' },
            },
            sepia: {
                body: { background: '#f4ecd8', color: '#5c4b37' },
            },
        };

        this.fonts = {
            default: 'inherit',
            serif: 'Georgia, "Times New Roman", serif',
            sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            mono: 'ui-monospace, "Cascadia Code", "Source Code Pro", monospace',
        };

        this.marginValues = {
            compact: { side: 20, top: 10 },
            normal: { side: 50, top: 20 },
            wide: { side: 100, top: 40 },
        };
    }

    applyTheme(themeName = null) {
        if (themeName) {
            this.currentTheme = themeName;
            localStorage.setItem('reader-theme', themeName);
        }

        const theme = this.themes[this.currentTheme];

        if (this.reader.rendition) {
            this.reader.rendition.themes.default(theme);
        }

        // Update reader container background
        const container = document.querySelector(this.reader.container);
        if (container) {
            container.classList.remove('bg-white', 'bg-slate-800', 'bg-[#f4ecd8]');

            const bgClass = {
                light: 'bg-white',
                dark: 'bg-slate-800',
                sepia: 'bg-[#f4ecd8]',
            }[this.currentTheme];

            container.classList.add(bgClass);
        }

        // Update active theme button
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('border-indigo-500');
            btn.classList.add('border-slate-600');
            if (btn.dataset.theme === this.currentTheme) {
                btn.classList.remove('border-slate-600');
                btn.classList.add('border-indigo-500');
            }
        });
    }

    setFontSize(size) {
        this.fontSize = Math.max(50, Math.min(200, size));
        localStorage.setItem('reader-font-size', this.fontSize);

        if (this.reader.rendition) {
            this.reader.rendition.themes.fontSize(`${this.fontSize}%`);
        }

        this.updateFontSizeUI();
    }

    increaseFontSize() {
        this.setFontSize(this.fontSize + 10);
    }

    decreaseFontSize() {
        this.setFontSize(this.fontSize - 10);
    }

    setFontFamily(fontKey) {
        this.fontFamily = fontKey;
        localStorage.setItem('reader-font-family', fontKey);

        if (this.reader.rendition) {
            const fontValue = this.fonts[fontKey] || 'inherit';
            this.reader.rendition.themes.font(fontValue);
        }

        this.updateFontFamilyUI();
    }

    setLineHeight(value) {
        this.lineHeight = Math.max(1.0, Math.min(2.5, value));
        localStorage.setItem('reader-line-height', this.lineHeight);

        if (this.reader.rendition) {
            this.reader.rendition.themes.override('line-height', `${this.lineHeight}`);
        }

        this.updateLineHeightUI();
    }

    increaseLineHeight() {
        this.setLineHeight(this.lineHeight + 0.1);
    }

    decreaseLineHeight() {
        this.setLineHeight(this.lineHeight - 0.1);
    }

    setMargins(marginKey) {
        this.margins = marginKey;
        localStorage.setItem('reader-margins', marginKey);
        this.applyMargins();
        this.updateMarginsUI();
    }

    applyMargins() {
        if (!this.reader.rendition) return;

        const margin = this.marginValues[this.margins] || this.marginValues.normal;
        this.reader.rendition.themes.override('padding', `${margin.top}px ${margin.side}px`);
    }

    setFlowMode(mode) {
        this.flowMode = mode;
        localStorage.setItem('reader-flow', mode);

        // Need to re-render with new flow mode
        if (this.reader.rendition && this.reader.book) {
            const currentLocation = this.reader.rendition.currentLocation();
            const cfi = currentLocation?.start?.cfi;

            // Destroy and recreate rendition with new flow
            this.reader.rendition.destroy();

            const containerEl = document.querySelector(this.reader.container);
            this.reader.rendition = this.reader.book.renderTo(containerEl, {
                width: '100%',
                height: '100%',
                spread: 'none',
                flow: mode,
                allowScriptedContent: true,
            });

            // Re-apply all settings
            this.applyTheme();
            this.applyTypography();

            // Restore position
            if (cfi) {
                this.reader.rendition.display(cfi);
            } else {
                this.reader.rendition.display();
            }

            // Re-setup event listeners
            this.reader.setupEventListeners();
        }

        this.updateFlowModeUI();
    }

    applyTypography() {
        if (this.reader.rendition) {
            this.reader.rendition.themes.fontSize(`${this.fontSize}%`);
            const fontValue = this.fonts[this.fontFamily] || 'inherit';
            this.reader.rendition.themes.font(fontValue);
            this.reader.rendition.themes.override('line-height', `${this.lineHeight}`);
            this.applyMargins();
        }
        this.updateFontSizeUI();
        this.updateFontFamilyUI();
        this.updateLineHeightUI();
        this.updateMarginsUI();
        this.updateFlowModeUI();
    }

    updateFontSizeUI() {
        const sizeDisplay = document.querySelector('#font-size-display');
        if (sizeDisplay) {
            sizeDisplay.textContent = `${this.fontSize}%`;
        }
    }

    updateFontFamilyUI() {
        document.querySelectorAll('.font-btn').forEach(btn => {
            btn.classList.remove('border-indigo-500', 'bg-indigo-600/20');
            btn.classList.add('border-slate-600');
            if (btn.dataset.font === this.fontFamily) {
                btn.classList.remove('border-slate-600');
                btn.classList.add('border-indigo-500', 'bg-indigo-600/20');
            }
        });
    }

    updateLineHeightUI() {
        const display = document.querySelector('#line-height-display');
        if (display) {
            display.textContent = `${this.lineHeight.toFixed(1)}`;
        }
    }

    updateMarginsUI() {
        document.querySelectorAll('.margin-btn').forEach(btn => {
            btn.classList.remove('border-indigo-500', 'bg-indigo-600/20');
            btn.classList.add('border-slate-600');
            if (btn.dataset.margin === this.margins) {
                btn.classList.remove('border-slate-600');
                btn.classList.add('border-indigo-500', 'bg-indigo-600/20');
            }
        });
    }

    updateFlowModeUI() {
        document.querySelectorAll('.flow-btn').forEach(btn => {
            btn.classList.remove('border-indigo-500', 'bg-indigo-600/20');
            btn.classList.add('border-slate-600');
            if (btn.dataset.flow === this.flowMode) {
                btn.classList.remove('border-slate-600');
                btn.classList.add('border-indigo-500', 'bg-indigo-600/20');
            }
        });
    }

    getAvailableThemes() {
        return Object.keys(this.themes);
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    getFontSize() {
        return this.fontSize;
    }

    getFontFamily() {
        return this.fontFamily;
    }

    getLineHeight() {
        return this.lineHeight;
    }

    getMargins() {
        return this.margins;
    }

    getFlowMode() {
        return this.flowMode;
    }
}

export default ThemeManager;
