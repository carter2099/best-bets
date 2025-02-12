export interface APIError {
    status: 'error';
    message: string;
}

export function isAPIError(error: unknown): error is APIError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        'message' in error &&
        error.status === 'error'
    );
} 