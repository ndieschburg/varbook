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
}

export interface LoginResponse {
    message: string;
    user: import('./user').User;
}

export interface ListBooksParams {
    search?: string;
    status?: 'not_started' | 'reading' | 'finished';
    sort?: 'recent' | 'title' | 'author' | 'progress';
    page?: number;
}
