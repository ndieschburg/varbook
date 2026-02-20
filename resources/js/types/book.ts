export type BookStatus = 'not_started' | 'reading' | 'finished';

export interface Book {
    id: number;
    title: string;
    author: string;
    progress: number;
    status: BookStatus;
    is_finished: boolean;
    cover_url: string | null;
    file_hash: string;
    language: string | null;
    publisher: string | null;
    isbn: string | null;
    file_size: number;
    total_reading_seconds: number;
    formatted_reading_time: string;
    created_at: string;
    updated_at: string;
}

export interface ReadingSession {
    id: number;
    book_id: number;
    client: string;
    started_at: string;
    ended_at: string;
    duration_seconds: number;
    formatted_duration: string;
    progress_before: number;
    progress_after: number;
}

export interface BookProgress {
    progress: number;
    position: string | null;
    last_sync_at: string | null;
}
