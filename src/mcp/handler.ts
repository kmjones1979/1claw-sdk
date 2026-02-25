import type { McpToolResult } from "../types";
import type { OneclawClient } from "../core/client";

type ToolArgs = Record<string, unknown>;

/**
 * MCP tool dispatcher — routes incoming tool calls to the appropriate
 * SDK methods and returns structured MCP-compatible results.
 *
 * Usage:
 * ```ts
 * import { createClient } from "@1claw/sdk";
 * import { McpHandler } from "@1claw/sdk/mcp";
 *
 * const client = createClient({ ... });
 * const handler = new McpHandler(client);
 * const result = await handler.handle("1claw_get_secret", { vault_id: "...", key: "..." });
 * ```
 */
export class McpHandler {
    private handlers: Map<string, (args: ToolArgs) => Promise<McpToolResult>>;

    constructor(private readonly client: OneclawClient) {
        this.handlers = new Map([
            ["1claw_get_secret", this.getSecret.bind(this)],
            ["1claw_set_secret", this.setSecret.bind(this)],
            ["1claw_list_secret_keys", this.listSecretKeys.bind(this)],
            ["1claw_delete_secret", this.deleteSecret.bind(this)],
            ["1claw_list_vaults", this.listVaults.bind(this)],
            ["1claw_create_vault", this.createVault.bind(this)],
            ["1claw_request_approval", this.requestApproval.bind(this)],
            ["1claw_check_approval_status", this.checkApproval.bind(this)],
            ["1claw_pay_and_fetch", this.payAndFetch.bind(this)],
            ["1claw_share_secret", this.shareSecret.bind(this)],
        ]);
    }

    /** Dispatch a tool call by name. Throws if the tool name is unknown. */
    async handle(toolName: string, args: ToolArgs): Promise<McpToolResult> {
        const handler = this.handlers.get(toolName);
        if (!handler) {
            return {
                content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
                isError: true,
            };
        }
        try {
            return await handler(args);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: `Error: ${message}` }],
                isError: true,
            };
        }
    }

    /** Return the set of tool names this handler supports. */
    getToolNames(): string[] {
        return Array.from(this.handlers.keys());
    }

    // -----------------------------------------------------------------------
    // Tool implementations
    // -----------------------------------------------------------------------

    private async getSecret(args: ToolArgs): Promise<McpToolResult> {
        const vaultId = args.vault_id as string;
        const key = args.key as string;
        const reason = args.reason as string | undefined;

        const res = await this.client.secrets.get(vaultId, key, { reason });
        if (res.error) {
            if (res.error.type === "approval_required") {
                return this.text(
                    JSON.stringify({
                        status: "pending_approval",
                        message:
                            "Human approval is required to access this secret.",
                    }),
                );
            }
            return this.error(res.error.message);
        }

        return this.text(
            JSON.stringify({
                status: "available",
                id: res.data!.id,
                path: res.data!.path,
                type: res.data!.type,
                value: res.data!.value,
                version: res.data!.version,
            }),
        );
    }

    private async setSecret(args: ToolArgs): Promise<McpToolResult> {
        const vaultId = args.vault_id as string;
        const key = args.key as string;
        const value = args.value as string;
        const type = (args.type as string) ?? "generic";

        const res = await this.client.secrets.set(vaultId, key, value, {
            type,
        });
        if (res.error) return this.error(res.error.message);

        return this.text(
            JSON.stringify({
                status: "stored",
                id: res.data!.id,
                path: res.data!.path,
                version: res.data!.version,
            }),
        );
    }

    private async listSecretKeys(args: ToolArgs): Promise<McpToolResult> {
        const vaultId = args.vault_id as string;
        const prefix = args.prefix as string | undefined;

        const res = await this.client.secrets.list(vaultId, prefix);
        if (res.error) return this.error(res.error.message);

        const keys = res.data!.secrets.map((s) => ({
            path: s.path,
            type: s.type,
            version: s.version,
        }));

        return this.text(JSON.stringify({ status: "ok", keys }));
    }

    private async deleteSecret(args: ToolArgs): Promise<McpToolResult> {
        const vaultId = args.vault_id as string;
        const key = args.key as string;

        const res = await this.client.secrets.delete(vaultId, key);
        if (res.error) return this.error(res.error.message);

        return this.text(JSON.stringify({ status: "deleted", path: key }));
    }

    private async listVaults(_args: ToolArgs): Promise<McpToolResult> {
        const res = await this.client.vault.list();
        if (res.error) return this.error(res.error.message);

        const vaults = res.data!.vaults.map((v) => ({
            id: v.id,
            name: v.name,
            description: v.description,
        }));

        return this.text(JSON.stringify({ status: "ok", vaults }));
    }

    private async createVault(args: ToolArgs): Promise<McpToolResult> {
        const name = args.name as string;
        const description = args.description as string | undefined;

        const res = await this.client.vault.create({ name, description });
        if (res.error) return this.error(res.error.message);

        return this.text(
            JSON.stringify({
                status: "created",
                id: res.data!.id,
                name: res.data!.name,
            }),
        );
    }

    private async requestApproval(args: ToolArgs): Promise<McpToolResult> {
        const vaultId = args.vault_id as string;
        const secretPath = args.secret_path as string;
        const reason = args.reason as string | undefined;

        const res = await this.client.approvals.request({
            vault_id: vaultId,
            secret_path: secretPath,
            reason,
        });
        if (res.error) return this.error(res.error.message);

        return this.text(
            JSON.stringify({
                status: "pending",
                approval_request_id: res.data!.id,
                message:
                    "Approval request submitted. Waiting for human review.",
            }),
        );
    }

    private async checkApproval(args: ToolArgs): Promise<McpToolResult> {
        const requestId = args.request_id as string;

        const res = await this.client.approvals.check(requestId);
        if (res.error) return this.error(res.error.message);

        return this.text(
            JSON.stringify({
                status: res.data!.status,
                decided_by: res.data!.decided_by,
                decided_at: res.data!.decided_at,
            }),
        );
    }

    private async payAndFetch(args: ToolArgs): Promise<McpToolResult> {
        const vaultId = args.vault_id as string;
        const key = args.key as string;

        const res = await this.client.x402.withPayment(vaultId, key);
        if (res.error) return this.error(res.error.message);

        return this.text(
            JSON.stringify({
                status: "paid_and_fetched",
                id: res.data!.id,
                path: res.data!.path,
                type: res.data!.type,
                value: res.data!.value,
                version: res.data!.version,
            }),
        );
    }

    private async shareSecret(args: ToolArgs): Promise<McpToolResult> {
        const secretId = args.secret_id as string;
        const email = args.email as string;
        const expiresAt = args.expires_at as string;
        const maxAccessCount = (args.max_access_count as number) ?? 5;

        const res = await this.client.sharing.create(secretId, {
            recipient_type: "external_email",
            email,
            expires_at: expiresAt,
            max_access_count: maxAccessCount,
        });
        if (res.error) return this.error(res.error.message);

        return this.text(
            JSON.stringify({
                status: "shared",
                share_id: res.data!.id,
                recipient_email: email,
                expires_at: res.data!.expires_at,
                message: `Secret shared with ${email}. They will see it when they sign up or log in.`,
            }),
        );
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private text(text: string): McpToolResult {
        return { content: [{ type: "text", text }] };
    }

    private error(text: string): McpToolResult {
        return { content: [{ type: "text", text }], isError: true };
    }
}
