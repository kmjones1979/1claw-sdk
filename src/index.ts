// Client
export { OneclawClient, createClient } from "./client";

// Resource modules
export { VaultResource } from "./vault";
export { SecretsResource } from "./secrets";
export { AccessResource } from "./access";
export { AgentsResource } from "./agents";
export { SharingResource } from "./sharing";
export { ApprovalsResource } from "./approvals";
export { BillingResource } from "./billing";
export { AuditResource } from "./audit";
export { OrgResource } from "./org";
export { AuthResource } from "./auth";
export { ApiKeysResource } from "./api-keys";
export { ChainsResource } from "./chains";
export { X402Resource } from "./x402";

// Errors
export {
    OneclawError,
    AuthError,
    PaymentRequiredError,
    ApprovalRequiredError,
    NotFoundError,
    RateLimitError,
    ValidationError,
    ServerError,
} from "./errors";

// Types
export type {
    OneclawClientConfig,
    OneclawResponse,
    ResponseMeta,
    // Auth
    TokenRequest,
    AgentTokenRequest,
    UserApiKeyTokenRequest,
    GoogleAuthRequest,
    SignupRequest,
    TokenResponse,
    ChangePasswordRequest,
    // API Keys
    CreateApiKeyRequest,
    ApiKeyResponse,
    ApiKeyCreatedResponse,
    ApiKeyListResponse,
    // Vaults
    CreateVaultRequest,
    VaultResponse,
    VaultListResponse,
    // Secrets
    PutSecretRequest,
    SecretMetadataResponse,
    SecretResponse,
    SecretListResponse,
    // Policies
    CreatePolicyRequest,
    UpdatePolicyRequest,
    PolicyResponse,
    PolicyListResponse,
    // Agents
    CreateAgentRequest,
    UpdateAgentRequest,
    AgentResponse,
    AgentCreatedResponse,
    AgentListResponse,
    AgentKeyRotatedResponse,
    // Chains
    ChainResponse,
    ChainListResponse,
    CreateChainRequest,
    UpdateChainRequest,
    // Transactions (Crypto Proxy)
    SubmitTransactionRequest,
    SimulateTransactionRequest,
    SimulateBundleRequest,
    SimulateBundleItem,
    SimulationResponse,
    BundleSimulationResponse,
    BalanceChange,
    TransactionResponse,
    TransactionListResponse,
    // Sharing
    CreateShareRequest,
    ShareResponse,
    SharedSecretResponse,
    // Organization
    OrgMemberResponse,
    OrgMemberListResponse,
    UpdateMemberRoleRequest,
    // Billing
    MonthSummary,
    UsageSummaryResponse,
    UsageEventResponse,
    UsageHistoryResponse,
    // Audit
    AuditQuery,
    AuditEvent,
    AuditEventsResponse,
    // x402
    PaymentAccept,
    PaymentRequirement,
    PaymentPayload,
    PaymentReceipt,
    X402Signer,
    // Approvals
    ApprovalRequest,
    CreateApprovalRequest,
    ApprovalListResponse,
    // Admin
    SettingResponse,
    SettingsListResponse,
    X402ConfigResponse,
    // Health
    HealthResponse,
    // MCP
    McpToolDefinition,
    McpToolResult,
} from "./types";
