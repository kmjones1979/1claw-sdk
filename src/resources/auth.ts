import type { HttpClient } from "../core/http";
import type {
    TokenRequest,
    AgentTokenRequest,
    UserApiKeyTokenRequest,
    GoogleAuthRequest,
    SignupRequest,
    ChangePasswordRequest,
    TokenResponse,
    OneclawResponse,
} from "../types";

/**
 * Auth resource — authenticate users and agents, manage sessions.
 * Successful authentication automatically stores the JWT on the client
 * so subsequent requests are authenticated.
 */
export class AuthResource {
    constructor(private readonly http: HttpClient) {}

    /**
     * Authenticate with email and password.
     * Stores the resulting JWT for subsequent requests.
     */
    async login(
        credentials: TokenRequest,
    ): Promise<OneclawResponse<TokenResponse>> {
        const res = await this.http.request<TokenResponse>(
            "POST",
            "/v1/auth/token",
            { body: credentials },
        );
        if (res.data?.access_token) {
            this.http.setToken(res.data.access_token);
        }
        return res;
    }

    /**
     * Create a new account with email and password.
     * Creates a new organization, returns a JWT, and automatically
     * claims any pending email-based secret shares.
     */
    async signup(
        credentials: SignupRequest,
    ): Promise<OneclawResponse<TokenResponse>> {
        const res = await this.http.request<TokenResponse>(
            "POST",
            "/v1/auth/signup",
            { body: credentials },
        );
        if (res.data?.access_token) {
            this.http.setToken(res.data.access_token);
        }
        return res;
    }

    /**
     * Authenticate an agent using its ID and API key.
     * Stores the resulting JWT for subsequent requests.
     */
    async agentToken(
        credentials: AgentTokenRequest,
    ): Promise<OneclawResponse<TokenResponse>> {
        const res = await this.http.request<TokenResponse>(
            "POST",
            "/v1/auth/agent-token",
            { body: credentials },
        );
        if (res.data?.access_token) {
            this.http.setToken(res.data.access_token);
        }
        return res;
    }

    /**
     * Authenticate with a user API key (prefix `ocv_`).
     * Stores the resulting JWT for subsequent requests.
     */
    async apiKeyToken(
        credentials: UserApiKeyTokenRequest,
    ): Promise<OneclawResponse<TokenResponse>> {
        const res = await this.http.request<TokenResponse>(
            "POST",
            "/v1/auth/api-key-token",
            { body: credentials },
        );
        if (res.data?.access_token) {
            this.http.setToken(res.data.access_token);
        }
        return res;
    }

    /**
     * Authenticate with a Google ID token (OAuth2 flow).
     * Stores the resulting JWT for subsequent requests.
     */
    async google(
        credentials: GoogleAuthRequest,
    ): Promise<OneclawResponse<TokenResponse>> {
        const res = await this.http.request<TokenResponse>(
            "POST",
            "/v1/auth/google",
            { body: credentials },
        );
        if (res.data?.access_token) {
            this.http.setToken(res.data.access_token);
        }
        return res;
    }

    /** Change the current user's password. */
    async changePassword(
        request: ChangePasswordRequest,
    ): Promise<OneclawResponse<void>> {
        return this.http.request<void>("POST", "/v1/auth/change-password", {
            body: request,
        });
    }

    /** Revoke the current session token. */
    async logout(): Promise<OneclawResponse<void>> {
        const res = await this.http.request<void>("DELETE", "/v1/auth/token");
        this.http.setToken("");
        return res;
    }
}
