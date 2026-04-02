import Dexie, { type EntityTable } from 'dexie';
import { debugLog, debugError } from './debugLogger';

export interface OfflineBook {
    id?: number;
    bookId: number;
    title: string;
    author: string;
    coverUrl: string | null;
    epubData: ArrayBuffer;
    downloadedAt: Date;
}

/**
 * Local position record for offline-first sync
 * syncedAt = null means pending sync to server
 */
export interface LocalPosition {
    id?: number;
    bookId: number;
    cfi: string;
    progress: number;
    timestamp: Date;
    syncedAt: Date | null;
}

/**
 * Tracks sync state per book for quick conflict detection
 * Allows comparing local vs server positions without querying all records
 */
export interface BookSyncState {
    bookId: number;
    lastLocalCfi: string;
    lastLocalProgress: number;
    lastLocalTimestamp: Date;
    lastServerCfi: string | null;
    lastServerProgress: number | null;
    lastServerTimestamp: Date | null;
}

// Keep old interface for migration compatibility
export interface OfflinePosition {
    id?: number;
    bookId: number;
    cfi: string;
    progress: number;
    timestamp: Date;
    synced?: boolean;
    syncedAt?: Date | null;
}

class OfflineDatabase extends Dexie {
    books!: EntityTable<OfflineBook, 'id'>;
    positions!: EntityTable<LocalPosition, 'id'>;
    syncState!: EntityTable<BookSyncState, 'bookId'>;

    constructor() {
        super('VarbookOffline');

        // Version 1: Original schema
        this.version(1).stores({
            books: '++id, bookId, downloadedAt',
            positions: '++id, bookId, synced, timestamp',
        });

        // Version 2: Local-first sync with syncState table
        this.version(2)
            .stores({
                books: '++id, bookId, downloadedAt',
                positions: '++id, bookId, syncedAt, timestamp',
                syncState: 'bookId',
            })
            .upgrade((tx) => {
                // Migrate synced: boolean to syncedAt: Date
                return tx
                    .table('positions')
                    .toCollection()
                    .modify((pos: OfflinePosition) => {
                        pos.syncedAt = pos.synced ? new Date() : null;
                        delete pos.synced;
                    });
            });
    }
}

export const db = new OfflineDatabase();

export async function saveBookOffline(
    bookId: number,
    title: string,
    author: string,
    coverUrl: string | null,
    epubData: ArrayBuffer
): Promise<number> {
    // Remove existing version if any
    await db.books.where('bookId').equals(bookId).delete();

    // Type assertion is safe here because id is auto-increment (++id), so add() always returns a number
    return db.books.add({
        bookId,
        title,
        author,
        coverUrl,
        epubData,
        downloadedAt: new Date(),
    }) as Promise<number>;
}

export async function getOfflineBook(bookId: number): Promise<OfflineBook | undefined> {
    return db.books.where('bookId').equals(bookId).first();
}

export async function removeOfflineBook(bookId: number): Promise<void> {
    await db.books.where('bookId').equals(bookId).delete();
}

export async function getAllOfflineBooks(): Promise<OfflineBook[]> {
    return db.books.toArray();
}

export async function isBookOffline(bookId: number): Promise<boolean> {
    const count = await db.books.where('bookId').equals(bookId).count();
    return count > 0;
}

/**
 * Save position locally (primary storage for local-first approach)
 * This is the guaranteed save - always succeeds unless IndexedDB is unavailable
 */
export async function saveLocalPosition(
    bookId: number,
    cfi: string,
    progress: number
): Promise<void> {
    const timestamp = new Date();
    debugLog('OfflineDB', 'Saving local position', { bookId, cfi, progress });

    try {
        await db.transaction('rw', [db.positions, db.syncState], async () => {
            // Add position record (pending sync)
            await db.positions.add({
                bookId,
                cfi,
                progress,
                timestamp,
                syncedAt: null,
            });

            // Update sync state for quick access
            const existing = await db.syncState.get(bookId);
            await db.syncState.put({
                bookId,
                lastLocalCfi: cfi,
                lastLocalProgress: progress,
                lastLocalTimestamp: timestamp,
                lastServerCfi: existing?.lastServerCfi ?? null,
                lastServerProgress: existing?.lastServerProgress ?? null,
                lastServerTimestamp: existing?.lastServerTimestamp ?? null,
            });
        });
        debugLog('OfflineDB', 'Local position saved successfully');
    } catch (error) {
        debugError('OfflineDB', 'Failed to save local position', error);
        throw error;
    }
}

/**
 * Get sync state for a book (for initial load and conflict detection)
 */
export async function getBookSyncState(
    bookId: number
): Promise<BookSyncState | undefined> {
    return db.syncState.get(bookId);
}

/**
 * Update server state after successful fetch (for multi-device sync)
 */
export async function updateServerState(
    bookId: number,
    cfi: string | null,
    progress: number,
    timestamp: Date
): Promise<void> {
    const existing = await db.syncState.get(bookId);
    await db.syncState.put({
        bookId,
        lastLocalCfi: existing?.lastLocalCfi ?? cfi ?? '',
        lastLocalProgress: existing?.lastLocalProgress ?? progress,
        lastLocalTimestamp: existing?.lastLocalTimestamp ?? timestamp,
        lastServerCfi: cfi,
        lastServerProgress: progress,
        lastServerTimestamp: timestamp,
    });
    debugLog('OfflineDB', 'Server state updated', { bookId, cfi, progress });
}

/**
 * Legacy function - kept for backward compatibility during migration
 * @deprecated Use saveLocalPosition instead
 */
export async function queuePositionSync(
    bookId: number,
    cfi: string,
    progress: number
): Promise<void> {
    return saveLocalPosition(bookId, cfi, progress);
}

/**
 * Get all positions pending sync to server
 */
export async function getUnsyncedPositions(): Promise<LocalPosition[]> {
    const positions = await db.positions
        .filter((pos) => pos.syncedAt === null)
        .toArray();
    debugLog('OfflineDB', `Getting unsynced positions: ${positions.length}`);
    return positions;
}

/**
 * Get the latest unsynced position for a specific book
 */
export async function getLatestUnsyncedPosition(
    bookId: number
): Promise<LocalPosition | null> {
    const positions = await db.positions
        .filter((pos) => pos.bookId === bookId && pos.syncedAt === null)
        .toArray();

    if (positions.length === 0) return null;

    // Return the most recent position (highest timestamp)
    const latest = positions.reduce((a, b) =>
        a.timestamp > b.timestamp ? a : b
    );
    debugLog('OfflineDB', `Latest unsynced position for book ${bookId}`, latest);
    return latest;
}

/**
 * Mark positions as synced after successful server sync
 */
export async function markPositionsSynced(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const now = new Date();
    await db.positions.where('id').anyOf(ids).modify({ syncedAt: now });
    debugLog('OfflineDB', `Marked ${ids.length} positions as synced`);
}

/**
 * Remove old synced positions to prevent IndexedDB bloat
 * Keeps positions for 7 days after sync
 */
export async function cleanupOldPositions(): Promise<number> {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const deleted = await db.positions
        .filter((pos) => pos.syncedAt !== null && pos.syncedAt < cutoff)
        .delete();
    if (deleted > 0) {
        debugLog('OfflineDB', `Cleaned up ${deleted} old positions`);
    }
    return deleted;
}

/**
 * @deprecated Use cleanupOldPositions instead
 */
export async function clearSyncedPositions(): Promise<void> {
    await cleanupOldPositions();
}

export async function getOfflineStorageUsage(): Promise<{
    bookCount: number;
    totalSize: number;
}> {
    const books = await db.books.toArray();
    const totalSize = books.reduce((sum, book) => sum + book.epubData.byteLength, 0);
    return {
        bookCount: books.length,
        totalSize,
    };
}
