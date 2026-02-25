export type { CryptoProvider, KeyMaterial } from "./crypto-provider";
export type { AuditSink, AuditSinkEvent } from "./audit-sink";
export type { PolicyEngine, PolicyContext, PolicyDecision } from "./policy-engine";

/**
 * Registry of optional plugins that can be passed to `createClient`.
 * All fields are optional — the SDK works without any plugins configured.
 */
export interface PluginRegistry {
    /** Client-side encryption provider (default: server-side HSM). */
    cryptoProvider?: import("./crypto-provider").CryptoProvider;
    /** Client-side audit sink for forwarding SDK events to external systems. */
    auditSink?: import("./audit-sink").AuditSink;
    /** Client-side policy engine for local pre-evaluation. */
    policyEngine?: import("./policy-engine").PolicyEngine;
}
