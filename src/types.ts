import type { components } from "./generated/api-types";

// Re-export the full generated types for advanced users who want raw
// spec-exact types (e.g. for openapi-fetch or custom codegen).
export type { paths, components, operations } from "./generated/api-types";

/**
 * Convenience alias for the generated component schemas.
 * Usage: `ApiSchemas["VaultResponse"]`, `ApiSchemas["AgentResponse"]`, etc.
 */
export type ApiSchemas = components["schemas"];

// ---------------------------------------------------------------------------
// Client configuration (SDK-only, not in the API spec)
// ---------------------------------------------------------------------------

export interface OneclawClientConfig {
    /** Base URL for the 1Claw API (e.g. "https://api.1claw.xyz") */
    baseUrl: string;
    /** Pre-existing Bearer token (user JWT or agent JWT). */
    token?: string;
    /** User API key — will be exchanged for a JWT on first request. */
    apiKey?: string;
    /** Optional: agent ID to pair with `apiKey` for agent-token auth. */
    agentId?: string;
    /** Signer for x402 payments. Implement this interface with your wallet. */
    x402Signer?: X402Signer;
    /** Maximum auto-pay amount in USD per request (default: 0 = never auto-pay). */
    maxAutoPayUsd?: number;
    /** Network for x402 payments (default: "eip155:8453" — Base). */
    network?: string;
    /** Optional plugin registry for extending the SDK with custom providers. */
    plugins?: import("./plugins").PluginRegistry;
}

// ---------------------------------------------------------------------------
// Standard response envelope (SDK-only)
// ---------------------------------------------------------------------------

export interface OneclawResponse<T> {
    data: T | null;
    error: { type: string; message: string; detail?: string } | null;
    meta?: ResponseMeta;
}

export interface ResponseMeta {
    status: number;
    requestId?: string;
}

// ---------------------------------------------------------------------------
// Auth — request types from generated spec
// ---------------------------------------------------------------------------

/** Login with email and password. Named `LoginRequest` in the OpenAPI spec. */
export type TokenRequest = ApiSchemas["LoginRequest"];

export type AgentTokenRequest = ApiSchemas["AgentTokenRequest"];

export type UserApiKeyTokenRequest = ApiSchemas["UserApiKeyTokenRequest"];

export type GoogleAuthRequest = ApiSchemas["GoogleAuthRequest"];

export type SignupRequest = ApiSchemas["SignupRequest"];

export type ChangePasswordRequest = ApiSchemas["ChangePasswordRequest"];

// Account management
export interface UserProfileResponse {
    id: string;
    email: string;
    display_name: string;
    auth_method: string;
    role: string;
    email_verified: boolean;
    marketing_emails: boolean;
    totp_enabled: boolean;
    created_at: string;
}

export interface UpdateProfileRequest {
    display_name?: string;
    marketing_emails?: boolean;
}

export interface DeleteAccountRequest {
    confirm: string;
}

// Agent self profile
export interface AgentSelfResponse {
    id: string;
    name: string;
    description: string;
    org_id: string;
    scopes: string[];
    is_active: boolean;
    crypto_proxy_enabled: boolean;
    created_by?: string;
    created_at: string;
    expires_at?: string;
    last_active_at?: string;
}

// Auth response — hand-written (stricter required fields)
export interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
}

// ---------------------------------------------------------------------------
// API Keys — request types from generated spec, responses hand-written
// ---------------------------------------------------------------------------

export type CreateApiKeyRequest = ApiSchemas["CreateApiKeyRequest"];

export interface ApiKeyResponse {
    id: string;
    name: string;
    key_prefix: string;
    scopes: string[];
    is_active: boolean;
    created_at: string;
    expires_at?: string;
    last_used_at?: string;
}

export interface ApiKeyCreatedResponse {
    key: ApiKeyResponse;
    api_key: string;
}

export interface ApiKeyListResponse {
    keys: ApiKeyResponse[];
}

// ---------------------------------------------------------------------------
// Vaults — request types from generated spec, responses hand-written
// ---------------------------------------------------------------------------

export type CreateVaultRequest = ApiSchemas["CreateVaultRequest"];

export interface VaultResponse {
    id: string;
    name: string;
    description: string;
    created_by: string;
    created_by_type: string;
    created_at: string;
    cmek_enabled?: boolean;
    cmek_fingerprint?: string;
}

export interface VaultListResponse {
    vaults: VaultResponse[];
}

export interface EnableCmekRequest {
    fingerprint: string;
}

export interface CmekRotationJobResponse {
    id: string;
    vault_id: string;
    old_fingerprint: string;
    new_fingerprint: string;
    status: string;
    total_secrets: number;
    processed: number;
    error?: string;
    started_at?: string;
    completed_at?: string;
    created_at: string;
}

// ---------------------------------------------------------------------------
// Secrets — request types from generated spec, responses hand-written
// ---------------------------------------------------------------------------

export type PutSecretRequest = ApiSchemas["PutSecretRequest"];

export interface SecretMetadataResponse {
    id: string;
    path: string;
    type: string;
    version: number;
    metadata: Record<string, unknown>;
    created_at: string;
    expires_at?: string;
}

export interface SecretResponse {
    id: string;
    path: string;
    type: string;
    value: string;
    version: number;
    metadata: Record<string, unknown>;
    created_by: string;
    created_at: string;
    expires_at?: string;
    cmek_encrypted?: boolean;
}

export interface SecretListResponse {
    secrets: SecretMetadataResponse[];
}

// ---------------------------------------------------------------------------
// Policies (Access Control) — request types from generated spec
// ---------------------------------------------------------------------------

export type CreatePolicyRequest = ApiSchemas["CreatePolicyRequest"];

export type UpdatePolicyRequest = ApiSchemas["UpdatePolicyRequest"];

export interface PolicyResponse {
    id: string;
    vault_id: string;
    secret_path_pattern: string;
    principal_type: string;
    principal_id: string;
    permissions: string[];
    conditions: Record<string, unknown>;
    expires_at?: string;
    created_by: string;
    created_by_type: string;
    created_at: string;
}

export interface PolicyListResponse {
    policies: PolicyResponse[];
}

// ---------------------------------------------------------------------------
// Agents — request types from generated spec, responses hand-written
// ---------------------------------------------------------------------------

/**
 * Hand-written: generated version marks `crypto_proxy_enabled` as required
 * (with default false), but SDK callers expect it to be optional.
 */
export interface CreateAgentRequest {
    name: string;
    description?: string;
    auth_method?: string;
    scopes?: string[];
    expires_at?: string;
    crypto_proxy_enabled?: boolean;
    tx_to_allowlist?: string[];
    tx_max_value_eth?: string;
    tx_daily_limit_eth?: string;
    tx_allowed_chains?: string[];
}

export type UpdateAgentRequest = ApiSchemas["UpdateAgentRequest"];

export interface AgentResponse {
    id: string;
    name: string;
    description: string;
    auth_method: string;
    scopes: string[];
    is_active: boolean;
    crypto_proxy_enabled: boolean;
    tx_to_allowlist?: string[];
    tx_max_value_eth?: string;
    tx_daily_limit_eth?: string;
    tx_allowed_chains?: string[];
    created_at: string;
    expires_at?: string;
    last_active_at?: string;
}

export interface AgentCreatedResponse {
    agent: AgentResponse;
    api_key: string;
}

export interface AgentListResponse {
    agents: AgentResponse[];
}

export interface AgentKeyRotatedResponse {
    api_key: string;
}

// ---------------------------------------------------------------------------
// Chains — request types from generated spec, responses hand-written
// ---------------------------------------------------------------------------

export interface ChainResponse {
    id: string;
    name: string;
    display_name: string;
    chain_id: number;
    rpc_url?: string;
    ws_url?: string;
    explorer_url?: string;
    native_currency: string;
    is_testnet: boolean;
    is_enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface ChainListResponse {
    chains: ChainResponse[];
}

/**
 * Hand-written: generated version marks `native_currency`, `is_testnet`,
 * `is_enabled` as required (with defaults), but SDK callers expect optional.
 */
export interface CreateChainRequest {
    name: string;
    display_name: string;
    chain_id: number;
    rpc_url?: string;
    ws_url?: string;
    explorer_url?: string;
    native_currency?: string;
    is_testnet?: boolean;
    is_enabled?: boolean;
}

export type UpdateChainRequest = ApiSchemas["UpdateChainRequest"];

// ---------------------------------------------------------------------------
// Transactions (Crypto Proxy) — request types from generated spec
// ---------------------------------------------------------------------------

/**
 * Hand-written: generated version marks `simulate_first` as required
 * (with default false), but SDK callers expect it to be optional.
 */
export interface SubmitTransactionRequest {
    to: string;
    value: string;
    chain: string;
    data?: string;
    signing_key_path?: string;
    nonce?: number;
    gas_price?: string;
    gas_limit?: number;
    max_fee_per_gas?: string;
    max_priority_fee_per_gas?: string;
    simulate_first?: boolean;
}

export type SimulateTransactionRequest = ApiSchemas["SimulateTransactionRequest"];

export interface SimulateBundleRequest {
    transactions: SimulateBundleItem[];
}

export type SimulateBundleItem = ApiSchemas["SimulateTransactionRequest"];

export interface BalanceChange {
    address: string;
    token?: string;
    token_symbol?: string;
    before?: string;
    after?: string;
    change?: string;
}

export interface SimulationResponse {
    simulation_id: string;
    status: "success" | "reverted" | "error";
    gas_used: number;
    gas_estimate_usd?: string;
    balance_changes: BalanceChange[];
    error?: string;
    error_code?: string;
    error_human_readable?: string;
    revert_reason?: string;
    tenderly_dashboard_url?: string;
    simulated_at: string;
}

export interface BundleSimulationResponse {
    simulations: SimulationResponse[];
}

export interface TransactionResponse {
    id: string;
    agent_id: string;
    chain: string;
    chain_id: number;
    to: string;
    value_wei: string;
    status: "pending" | "signed" | "broadcast" | "failed" | "simulation_failed";
    signed_tx?: string;
    tx_hash?: string;
    error_message?: string;
    created_at: string;
    signed_at?: string;
    simulation_id?: string;
    simulation_status?: string;
    max_fee_per_gas?: string;
    max_priority_fee_per_gas?: string;
}

export interface TransactionListResponse {
    transactions: TransactionResponse[];
}

// ---------------------------------------------------------------------------
// Sharing — request type from generated spec (has precise enum)
// ---------------------------------------------------------------------------

export type CreateShareRequest = ApiSchemas["CreateShareRequest"];

export interface ShareResponse {
    id: string;
    share_url: string;
    recipient_type: string;
    recipient_email?: string;
    expires_at: string;
    max_access_count: number;
}

export interface SharedSecretResponse {
    id: string;
    path: string;
    type: string;
    value: string;
    access_count: number;
    max_access_count: number;
}

// ---------------------------------------------------------------------------
// Organization — request type from generated spec (has precise enum)
// ---------------------------------------------------------------------------

export interface OrgMemberResponse {
    id: string;
    email: string;
    display_name: string;
    role: string;
    auth_method: string;
    created_at: string;
}

export interface OrgMemberListResponse {
    members: OrgMemberResponse[];
}

export type UpdateMemberRoleRequest = ApiSchemas["UpdateMemberRoleRequest"];

// ---------------------------------------------------------------------------
// Billing & Usage — hand-written (generated inline types differ structurally)
// ---------------------------------------------------------------------------

export interface MonthSummary {
    total_requests: number;
    paid_requests: number;
    free_requests: number;
    total_cost_usd: string;
}

export interface UsageSummaryResponse {
    billing_tier: string;
    free_tier_limit: number;
    current_month: MonthSummary;
}

export interface UsageEventResponse {
    id: string;
    principal_type: string;
    principal_id: string;
    method: string;
    endpoint: string;
    status_code: number;
    price_usd: string;
    is_paid: boolean;
    created_at: string;
}

export interface UsageHistoryResponse {
    events: UsageEventResponse[];
}

// ---------------------------------------------------------------------------
// Audit — hand-written (AuditQuery is SDK-only, not in the spec)
// ---------------------------------------------------------------------------

export interface AuditQuery {
    resource_id?: string;
    actor_id?: string;
    action?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
}

export interface AuditEvent {
    id: string;
    action: string;
    actor_id: string;
    actor_type: string;
    resource_type: string;
    resource_id: string;
    org_id: string;
    details: Record<string, unknown>;
    ip_address?: string;
    created_at: string;
}

export interface AuditEventsResponse {
    events: AuditEvent[];
    count: number;
}

// ---------------------------------------------------------------------------
// x402 Payment Protocol — hand-written (SDK-specific signer interface)
// ---------------------------------------------------------------------------

export interface PaymentAccept {
    scheme: string;
    network: string;
    payTo: string;
    price: string;
    requiredDeadlineSeconds: number;
}

export interface PaymentRequirement {
    x402Version: number;
    accepts: PaymentAccept[];
    description: string;
}

export interface PaymentPayload {
    x402Version: number;
    scheme: string;
    network: string;
    payload: string;
}

export interface PaymentReceipt {
    x402Version: number;
    scheme: string;
    network: string;
    payload: string;
    txHash?: string;
}

/**
 * Interface for wallet signers that can produce x402 payment signatures.
 * Implement this with your preferred wallet library (ethers, viem, etc.).
 */
export interface X402Signer {
    /** The wallet address that will be debited. */
    getAddress(): Promise<string>;
    /** Sign an EIP-712 typed-data payload and return the signature bytes. */
    signPayment(requirement: PaymentAccept): Promise<string>;
}

// ---------------------------------------------------------------------------
// Approvals (Human-in-the-loop) — hand-written (not fully in spec yet)
// ---------------------------------------------------------------------------

export interface ApprovalRequest {
    id: string;
    vault_id: string;
    secret_path: string;
    requester_id: string;
    requester_type: string;
    reason?: string;
    status: "pending" | "approved" | "denied";
    decided_by?: string;
    decided_at?: string;
    created_at: string;
}

export interface CreateApprovalRequest {
    vault_id: string;
    secret_path: string;
    reason?: string;
}

export interface ApprovalListResponse {
    approvals: ApprovalRequest[];
}

// ---------------------------------------------------------------------------
// Admin — hand-written (stricter required fields)
// ---------------------------------------------------------------------------

export interface SettingResponse {
    key: string;
    value: string;
    updated_by?: string;
    updated_at: string;
}

export interface SettingsListResponse {
    settings: SettingResponse[];
}

export interface X402ConfigResponse {
    pay_to: string;
    network: string;
    scheme: string;
    free_tier_limit: number;
    facilitator_url: string;
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export interface HealthResponse {
    status: string;
    hsm?: string;
}

// ---------------------------------------------------------------------------
// MCP Tool definitions (SDK-only, not in the API spec)
// ---------------------------------------------------------------------------

export interface McpToolDefinition {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}

export interface McpToolResult {
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
}
