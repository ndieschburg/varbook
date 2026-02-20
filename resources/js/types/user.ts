export interface User {
    id: number;
    name: string;
    email: string;
    is_admin: boolean;
    locale?: string;
    timezone?: string;
    created_at: string;
    books_count?: number;
}
