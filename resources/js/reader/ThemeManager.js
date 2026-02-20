class ThemeManager {
    constructor(reader) {
        this.reader = reader;
        this.currentTheme = localStorage.getItem('reader-theme') || 'dark';

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

    getAvailableThemes() {
        return Object.keys(this.themes);
    }

    getCurrentTheme() {
        return this.currentTheme;
    }
}

export default ThemeManager;
