class PositionSync {
    constructor(reader) {
        this.reader = reader;
        this.saveTimeout = null;
        this.lastSavedCfi = null;
        this.debounceMs = 2000; // 2 second debounce on page turns
    }

    async load() {
        try {
            const response = await axios.get(
                `${this.reader.apiBaseUrl}/${this.reader.bookId}/position`
            );
            return response.data.success ? response.data.data : null;
        } catch (error) {
            console.error('Failed to load position:', error);
            return null;
        }
    }

    save(cfi, progress) {
        // Debounce saves to avoid excessive API calls
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
            this.doSave(cfi, progress);
        }, this.debounceMs);
    }

    async doSave(cfi, progress) {
        if (cfi === this.lastSavedCfi) return;

        try {
            await axios.post(
                `${this.reader.apiBaseUrl}/${this.reader.bookId}/position`,
                { cfi, progress }
            );
            this.lastSavedCfi = cfi;
        } catch (error) {
            console.error('Failed to save position:', error);
        }
    }

    flushSync() {
        // Force immediate save on reader close
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        // Get current location and save immediately
        const location = this.reader.rendition?.currentLocation();
        if (location && location.start) {
            const progress = this.reader.currentProgress || 0;
            this.doSave(location.start.cfi, progress);
        }
    }
}

export default PositionSync;
