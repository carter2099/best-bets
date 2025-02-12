export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export class TokenScanError extends AppError {
    constructor(message: string) {
        super(message, 500);
    }
}

export class APIError extends AppError {
    constructor(message: string, statusCode: number = 500) {
        super(message, statusCode);
    }
} 