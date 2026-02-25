/**
 * Event emitted to an AuditSink after each SDK operation.
 */
export interface AuditSinkEvent {
    /** ISO-8601 timestamp of the event. */
    timestamp: string;
    /** HTTP method used (GET, POST, PUT, DELETE). */
    method: string;
    /** API path called (e.g. "/v1/vaults/abc/secrets/my-key"). */
    path: string;
    /** HTTP status code returned. */
    statusCode: number;
    /** Duration of the request in milliseconds. */
    durationMs: number;
    /** Whether the request was successful. */
    success: boolean;
    /** Error message if the request failed. */
    error?: string;
}

/**
 * Interface for client-side audit sinks.
 *
 * The server maintains its own immutable audit log. This interface is for
 * clients that want to forward SDK activity to external observability
 * platforms (Splunk, Datadog, etc.) or local logs.
 *
 * @example
 * ```ts
 * import type { AuditSink, AuditSinkEvent } from "@1claw/sdk";
 *
 * class SplunkAuditSink implements AuditSink {
 *   async emit(event: AuditSinkEvent): Promise<void> {
 *     await fetch("https://hec.splunk.example.com", {
 *       method: "POST",
 *       body: JSON.stringify({ event }),
 *     });
 *   }
 *   async flush(): Promise<void> { }
 * }
 * ```
 */
export interface AuditSink {
    /** Emit a single audit event. Implementations should not throw. */
    emit(event: AuditSinkEvent): Promise<void>;

    /** Flush any buffered events. Called on client disposal. */
    flush?(): Promise<void>;
}
