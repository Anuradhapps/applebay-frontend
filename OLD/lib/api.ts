const API_BASE_URL = "http://localhost:8080/api";

async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
        cache: "no-store",
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Request failed: ${response.status}`);
    }

    const responseText = await response.text();

    if (!responseText) {
        return undefined as T;
    }

    return JSON.parse(responseText) as T;
}

export const api = {
    get: <T>(endpoint: string) => request<T>(endpoint),

    post: <T>(endpoint: string, data: unknown) =>
        request<T>(endpoint, {
            method: "POST",
            body: JSON.stringify(data),
        }),

    put: <T>(endpoint: string, data: unknown) =>
        request<T>(endpoint, {
            method: "PUT",
            body: JSON.stringify(data),
        }),

    delete: <T>(endpoint: string) =>
        request<T>(endpoint, {
            method: "DELETE",
        }),
};