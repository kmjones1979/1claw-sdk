/**
 * Context passed to a PolicyEngine for evaluation.
 */
export interface PolicyContext {
    /** The principal making the request (user ID or agent ID). */
    principalId: string;
    /** Principal type: "user" or "agent". */
    principalType: "user" | "agent";
    /** The secret path being accessed. */
    secretPath: string;
    /** The operation being performed. */
    operation: "read" | "write" | "delete" | "list";
    /** Client IP address, if available. */
    clientIp?: string;
    /** Additional context metadata. */
    metadata?: Record<string, unknown>;
}

/**
 * Decision returned by a PolicyEngine.
 */
export interface PolicyDecision {
    /** Whether access is allowed. */
    allowed: boolean;
    /** Human-readable reason for the decision. */
    reason?: string;
    /** Policy ID that matched, if any. */
    matchedPolicyId?: string;
}

/**
 * Interface for client-side policy engines.
 *
 * The server enforces its own policy engine (the source of truth).
 * This interface is for clients that want to pre-evaluate policies
 * locally before making API calls — e.g. for UX (disable buttons
 * for actions that would be denied) or for integrating with external
 * policy systems like OPA.
 *
 * @example
 * ```ts
 * import type { PolicyEngine, PolicyContext, PolicyDecision } from "@1claw/sdk";
 *
 * class OpaEngine implements PolicyEngine {
 *   async evaluate(ctx: PolicyContext): Promise<PolicyDecision> {
 *     const res = await fetch("http://opa:8181/v1/data/1claw/allow", {
 *       method: "POST",
 *       body: JSON.stringify({ input: ctx }),
 *     });
 *     const { result } = await res.json();
 *     return { allowed: result, reason: result ? "OPA allowed" : "OPA denied" };
 *   }
 * }
 * ```
 */
export interface PolicyEngine {
    /** Evaluate whether the given context should be allowed. */
    evaluate(context: PolicyContext): Promise<PolicyDecision>;
}
