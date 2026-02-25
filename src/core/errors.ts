import type { PaymentRequirement } from "../types";

/**
 * Base error class for all 1Claw SDK errors.
 * Includes the HTTP status code and a machine-readable error type.
 */
export class OneclawError extends Error {
    readonly status: number;
    readonly type: string;
    readonly detail?: string;

    constructor(
        message: string,
        status: number,
        type: string,
        detail?: string,
    ) {
        super(message);
        this.name = "OneclawError";
        this.status = status;
        this.type = type;
        this.detail = detail;
    }
}

/** Thrown on 401 Unauthorized or 403 Forbidden responses. */
export class AuthError extends OneclawError {
    constructor(message: string, status: 401 | 403 = 401) {
        super(message, status, "auth_error");
        this.name = "AuthError";
    }
}

/**
 * Thrown on 402 Payment Required responses.
 * Contains the full `PaymentRequirement` so callers can inspect
 * price, network, and payment address before deciding to pay.
 */
export class PaymentRequiredError extends OneclawError {
    readonly paymentRequirement: PaymentRequirement;

    constructor(message: string, paymentRequirement: PaymentRequirement) {
        super(message, 402, "payment_required");
        this.name = "PaymentRequiredError";
        this.paymentRequirement = paymentRequirement;
    }
}

/**
 * Thrown when a secret is gated behind human approval.
 * The `approvalRequestId` can be used to poll for approval status.
 */
export class ApprovalRequiredError extends OneclawError {
    readonly approvalRequestId: string;

    constructor(approvalRequestId: string, message?: string) {
        super(
            message ?? "Human approval is required to access this secret",
            403,
            "approval_required",
        );
        this.name = "ApprovalRequiredError";
        this.approvalRequestId = approvalRequestId;
    }
}

/** Thrown on 404 Not Found responses. */
export class NotFoundError extends OneclawError {
    constructor(message: string = "Resource not found") {
        super(message, 404, "not_found");
        this.name = "NotFoundError";
    }
}

/** Thrown on 429 Too Many Requests responses. Includes retry timing when available. */
export class RateLimitError extends OneclawError {
    readonly retryAfterMs?: number;

    constructor(
        message: string = "Rate limit exceeded",
        retryAfterMs?: number,
    ) {
        super(message, 429, "rate_limit");
        this.name = "RateLimitError";
        this.retryAfterMs = retryAfterMs;
    }
}

/** Thrown on 400 Bad Request responses for validation failures. */
export class ValidationError extends OneclawError {
    readonly fields?: Record<string, string>;

    constructor(message: string, fields?: Record<string, string>) {
        super(message, 400, "validation_error");
        this.name = "ValidationError";
        this.fields = fields;
    }
}

/** Thrown on 500+ server-side errors. */
export class ServerError extends OneclawError {
    constructor(
        message: string = "Internal server error",
        status: number = 500,
    ) {
        super(message, status, "server_error");
        this.name = "ServerError";
    }
}

/**
 * Parse an HTTP response into the appropriate typed error.
 * Falls back to a generic `OneclawError` for unrecognised status codes.
 */
export async function errorFromResponse(res: Response): Promise<OneclawError> {
    let body: Record<string, unknown> = {};
    try {
        body = (await res.json()) as Record<string, unknown>;
    } catch {
        /* response may not be JSON */
    }

    const message =
        (body.detail as string) ??
        (body.message as string) ??
        (body.error as string) ??
        `HTTP ${res.status}`;

    switch (res.status) {
        case 400:
            return new ValidationError(
                message,
                body.fields as Record<string, string>,
            );
        case 401:
        case 403:
            return new AuthError(message, res.status as 401 | 403);
        case 402: {
            const requirement = body as unknown as PaymentRequirement;
            return new PaymentRequiredError(message, requirement);
        }
        case 404:
            return new NotFoundError(message);
        case 429: {
            const retryHeader = res.headers.get("Retry-After");
            const retryAfterMs = retryHeader
                ? parseInt(retryHeader, 10) * 1000
                : undefined;
            return new RateLimitError(message, retryAfterMs);
        }
        default:
            if (res.status >= 500) return new ServerError(message, res.status);
            return new OneclawError(message, res.status, "unknown");
    }
}
