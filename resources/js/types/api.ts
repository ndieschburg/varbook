export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

export interface ApiError {
    message: string;
    errors?: Record<string, string[]>;
}

export interface LoginCredentials {
    email: string;
    password: string;
    remember?: boolean;
}

export interface LoginResponse {
    message: string;
    user: import('./user').User;
}

export interface RegisterCredentials {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
}

export interface RegisterResponse {
    message: string;
    user: import('./user').User;
    requires_verification: boolean;
}

export interface RegistrationStatus {
    enabled: boolean;
}

export interface ListBooksParams {
    search?: string;
    status?: 'not_started' | 'reading' | 'finished';
    sort?: 'recent' | 'title' | 'author' | 'progress';
    page?: number;
}

export interface MonthlyReading {
    month: string;
    hours: number;
    sessions: number;
}

export interface ClientReading {
    client: string;
    label: string;
    hours: number;
    sessions: number;
}

export interface RecentSession {
    id: number;
    book: {
        id: number;
        title: string;
        author: string;
        cover_url: string | null;
    };
    started_at: string;
    duration_seconds: number;
    formatted_duration: string;
    client: string;
}

export interface UserStats {
    total_books: number;
    books_finished: number;
    books_reading: number;
    books_not_started: number;
    total_reading_seconds: number;
    total_reading_time: string;
    total_sessions: number;
    reading_by_month: MonthlyReading[];
    reading_by_client: ClientReading[];
    recent_sessions: RecentSession[];
}

export interface ProgressLog {
    id: number;
    user_id: number;
    book_id: number | null;
    action: string;
    client: string | null;
    request_data: Record<string, unknown>;
    response_data: Record<string, unknown>;
    ip_address: string | null;
    user_agent: string | null;
    success: boolean;
    error_message: string | null;
    created_at: string;
    user?: {
        id: number;
        name: string;
        email: string;
    };
    book?: {
        id: number;
        title: string;
        author?: string;
    };
}

export interface ProgressLogsStats {
    total_logs: number;
    logs_today: number;
    failed_logs: number;
    by_action: Record<string, number>;
    by_client: Record<string, number>;
    logging_enabled: boolean;
}
