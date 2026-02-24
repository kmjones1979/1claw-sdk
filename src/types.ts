// ---------------------------------------------------------------------------
// Client configuration
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
}

// ---------------------------------------------------------------------------
// Standard response envelope
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
// Auth
// ---------------------------------------------------------------------------

export interface TokenRequest {
    email: string;
    password: string;
}

export interface AgentTokenRequest {
    agent_id: string;
    api_key: string;
}

export interface UserApiKeyTokenRequest {
    api_key: string;
}

export interface GoogleAuthRequest {
    id_token: string;
}

export interface SignupRequest {
    email: string;
    password: string;
    display_name?: string;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
}

export interface ChangePasswordRequest {
    current_password: string;
    new_password: string;
}

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------

export interface CreateApiKeyRequest {
    name: string;
    scopes?: string[];
    expires_at?: string;
}

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
// Vaults
// ---------------------------------------------------------------------------

export interface CreateVaultRequest {
    name: string;
    description?: string;
}

export interface VaultResponse {
    id: string;
    name: string;
    description: string;
    created_by: string;
    created_by_type: string;
    created_at: string;
}

export interface VaultListResponse {
    vaults: VaultResponse[];
}

// ---------------------------------------------------------------------------
// Secrets
// ---------------------------------------------------------------------------

export interface PutSecretRequest {
    type: string;
    value: string;
    metadata?: Record<string, unknown>;
    expires_at?: string;
    rotation_policy?: Record<string, unknown>;
    max_access_count?: number;
}

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
}

export interface SecretListResponse {
    secrets: SecretMetadataResponse[];
}

// ---------------------------------------------------------------------------
// Policies (Access Control)
// ---------------------------------------------------------------------------

export interface CreatePolicyRequest {
    secret_path_pattern: string;
    principal_type: string;
    principal_id: string;
    permissions: string[];
    conditions?: Record<string, unknown>;
    expires_at?: string;
}

export interface UpdatePolicyRequest {
    permissions: string[];
    conditions?: Record<string, unknown>;
    expires_at?: string;
}

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
// Agents
// ---------------------------------------------------------------------------

export interface CreateAgentRequest {
    name: string;
    description?: string;
    auth_method?: string;
    scopes?: string[];
    expires_at?: string;
    /** Enable the crypto transaction proxy for this agent (default: false). */
    crypto_proxy_enabled?: boolean;
}

export interface UpdateAgentRequest {
    name?: string;
    scopes?: string[];
    is_active?: boolean;
    expires_at?: string | null;
    /** Toggle the crypto transaction proxy for this agent. */
    crypto_proxy_enabled?: boolean;
}

export interface AgentResponse {
    id: string;
    name: string;
    description: string;
    auth_method: string;
    scopes: string[];
    is_active: boolean;
    /** Whether this agent can submit transactions through the signing proxy. */
    crypto_proxy_enabled: boolean;
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
// Chains
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

export interface UpdateChainRequest {
    display_name?: string;
    rpc_url?: string;
    ws_url?: string;
    explorer_url?: string;
    native_currency?: string;
    is_testnet?: boolean;
    is_enabled?: boolean;
}

// ---------------------------------------------------------------------------
// Transactions (Crypto Proxy)
// ---------------------------------------------------------------------------

export interface SubmitTransactionRequest {
    /** Destination address (0x-prefixed). */
    to: string;
    /** Value in ETH as a decimal string (e.g. "0.01"). */
    value: string;
    /** Chain name ("base", "ethereum", …) or numeric chain ID. */
    chain: string;
    /** Hex-encoded calldata for contract interactions. */
    data?: string;
    /** Vault path to the signing key. Defaults to `keys/{chain}-signer`. */
    signing_key_path?: string;
    /** Transaction nonce. Auto-resolved from RPC when omitted. */
    nonce?: number;
    /** Gas price in wei (legacy). Defaults to 1 gwei. Ignored when EIP-1559 fields are set. */
    gas_price?: string;
    /** Gas limit. Defaults to 21 000. */
    gas_limit?: number;
    /** EIP-1559 max fee per gas in wei. When set, uses Type 2 signing. */
    max_fee_per_gas?: string;
    /** EIP-1559 max priority fee per gas in wei. */
    max_priority_fee_per_gas?: string;
    /** When true, simulate via Tenderly before signing. If simulation reverts, returns 422. */
    simulate_first?: boolean;
}

export interface SimulateTransactionRequest {
    to: string;
    value: string;
    chain: string;
    data?: string;
    signing_key_path?: string;
    gas_limit?: number;
}

export interface SimulateBundleRequest {
    transactions: SimulateBundleItem[];
}

export interface SimulateBundleItem {
    to: string;
    value: string;
    chain: string;
    data?: string;
    signing_key_path?: string;
    gas_limit?: number;
}

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
// Sharing
// ---------------------------------------------------------------------------

export interface CreateShareRequest {
    recipient_type: string;
    recipient_id?: string;
    /** Email address for invite-by-email shares (recipient_type = "external_email"). */
    email?: string;
    permissions?: string[];
    max_access_count?: number;
    expires_at: string;
    passphrase?: string;
    ip_allowlist?: string[];
}

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
// Organization
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

export interface UpdateMemberRoleRequest {
    role: "owner" | "admin" | "member";
}

// ---------------------------------------------------------------------------
// Billing & Usage
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
// Audit
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
// x402 Payment Protocol
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
// Approvals (Human-in-the-loop) — future API
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
// Admin
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
// MCP Tool definitions
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
