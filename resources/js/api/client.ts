import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    },
    withCredentials: true,
    withXSRFToken: true,
    // Explicit params serializer to avoid array/comma serialization issues in axios 1.x
    paramsSerializer: {
        indexes: null, // Use default array serialization (key[]=value)
    },
});

// Add CSRF token to all requests
api.interceptors.request.use((config) => {
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (token) {
        config.headers['X-CSRF-TOKEN'] = token;
    }
    return config;
});

// Initialize Sanctum CSRF cookie
export async function initCsrf(): Promise<void> {
    await axios.get('/sanctum/csrf-cookie', { withCredentials: true });
}

export default api;
