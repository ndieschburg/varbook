import Dexie, { type EntityTable } from 'dexie';
import { debugLog } from './debugLogger';

export interface OfflineBook {
    id?: number;
    bookId: number;
    title: string;
    author: string;
    coverUrl: string | null;
    epubData: ArrayBuffer;
    downloadedAt: Date;
}

export interface OfflinePosition {
    id?: number;
    bookId: number;
    cfi: string;
    progress: number;
    timestamp: Date;
    synced: boolean;
}

class OfflineDatabase extends Dexie {
    books!: EntityTable<OfflineBook, 'id'>;
    positions!: EntityTable<OfflinePosition, 'id'>;

    constructor() {
        super('BookShelfOffline');
        this.version(1).stores({
            books: '++id, bookId, downloadedAt',
            positions: '++id, bookId, synced, timestamp',
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

    return db.books.add({
        bookId,
        title,
        author,
        coverUrl,
        epubData,
        downloadedAt: new Date(),
    });
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

export async function queuePositionSync(
    bookId: number,
    cfi: string,
    progress: number
): Promise<void> {
    debugLog('OfflineDB', 'Queuing position', { bookId, cfi, progress });
    const id = await db.positions.add({
        bookId,
        cfi,
        progress,
        timestamp: new Date(),
        synced: false,
    });
    debugLog('OfflineDB', `Position queued with id: ${id}`);
}

export async function getUnsyncedPositions(): Promise<OfflinePosition[]> {
    const positions = await db.positions.filter((pos) => pos.synced === false).toArray();
    debugLog('OfflineDB', `Getting unsynced positions: ${positions.length}`, positions);
    return positions;
}

export async function getLatestUnsyncedPosition(bookId: number): Promise<OfflinePosition | null> {
    const positions = await db.positions
        .filter((pos) => pos.bookId === bookId && pos.synced === false)
        .toArray();

    if (positions.length === 0) return null;

    // Return the most recent position (highest timestamp)
    const latest = positions.reduce((a, b) =>
        a.timestamp > b.timestamp ? a : b
    );
    debugLog('OfflineDB', `Latest unsynced position for book ${bookId}`, latest);
    return latest;
}

export async function markPositionsSynced(ids: number[]): Promise<void> {
    await db.positions.where('id').anyOf(ids).modify({ synced: true });
}

export async function clearSyncedPositions(): Promise<void> {
    await db.positions.filter((pos) => pos.synced === true).delete();
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
