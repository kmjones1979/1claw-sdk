import { describe, it, expect } from "vitest";
import {
    OneclawError,
    AuthError,
    PaymentRequiredError,
    ApprovalRequiredError,
    NotFoundError,
    RateLimitError,
    ValidationError,
    ServerError,
    errorFromResponse,
} from "../core/errors";

describe("Error classes", () => {
    it("OneclawError stores status, type, and detail", () => {
        const err = new OneclawError("msg", 418, "teapot", "short and stout");
        expect(err.message).toBe("msg");
        expect(err.status).toBe(418);
        expect(err.type).toBe("teapot");
        expect(err.detail).toBe("short and stout");
        expect(err.name).toBe("OneclawError");
        expect(err).toBeInstanceOf(Error);
    });

    it("AuthError defaults to 401", () => {
        const err = new AuthError("bad token");
        expect(err.status).toBe(401);
        expect(err.type).toBe("auth_error");
    });

    it("AuthError accepts 403", () => {
        const err = new AuthError("forbidden", 403);
        expect(err.status).toBe(403);
    });

    it("PaymentRequiredError includes paymentRequirement", () => {
        const req = { x402Version: 1, accepts: [], description: "pay" };
        const err = new PaymentRequiredError("pay up", req);
        expect(err.status).toBe(402);
        expect(err.paymentRequirement).toBe(req);
    });

    it("ApprovalRequiredError includes approvalRequestId", () => {
        const err = new ApprovalRequiredError("req-123");
        expect(err.status).toBe(403);
        expect(err.approvalRequestId).toBe("req-123");
        expect(err.message).toContain("approval");
    });

    it("NotFoundError defaults message", () => {
        const err = new NotFoundError();
        expect(err.status).toBe(404);
        expect(err.message).toBe("Resource not found");
    });

    it("RateLimitError includes retryAfterMs", () => {
        const err = new RateLimitError("slow down", 5000);
        expect(err.status).toBe(429);
        expect(err.retryAfterMs).toBe(5000);
    });

    it("ValidationError includes fields", () => {
        const err = new ValidationError("bad input", { name: "required" });
        expect(err.status).toBe(400);
        expect(err.fields).toEqual({ name: "required" });
    });

    it("ServerError defaults to 500", () => {
        const err = new ServerError();
        expect(err.status).toBe(500);
        expect(err.type).toBe("server_error");
    });
});

describe("errorFromResponse", () => {
    function fakeResponse(status: number, body: unknown, headers?: Record<string, string>) {
        return {
            status,
            ok: status >= 200 && status < 300,
            headers: new Headers(headers),
            json: () => Promise.resolve(body),
        } as unknown as Response;
    }

    it("maps 400 to ValidationError", async () => {
        const err = await errorFromResponse(fakeResponse(400, { detail: "bad field" }));
        expect(err).toBeInstanceOf(ValidationError);
        expect(err.message).toBe("bad field");
    });

    it("maps 401 to AuthError", async () => {
        const err = await errorFromResponse(fakeResponse(401, { detail: "expired" }));
        expect(err).toBeInstanceOf(AuthError);
        expect(err.status).toBe(401);
    });

    it("maps 403 to AuthError", async () => {
        const err = await errorFromResponse(fakeResponse(403, { detail: "forbidden" }));
        expect(err).toBeInstanceOf(AuthError);
        expect(err.status).toBe(403);
    });

    it("maps 402 to PaymentRequiredError", async () => {
        const body = { x402Version: 1, accepts: [], description: "pay" };
        const err = await errorFromResponse(fakeResponse(402, body));
        expect(err).toBeInstanceOf(PaymentRequiredError);
    });

    it("maps 404 to NotFoundError", async () => {
        const err = await errorFromResponse(fakeResponse(404, { detail: "gone" }));
        expect(err).toBeInstanceOf(NotFoundError);
    });

    it("maps 429 to RateLimitError with Retry-After header", async () => {
        const err = await errorFromResponse(
            fakeResponse(429, { detail: "too many" }, { "Retry-After": "5" }),
        );
        expect(err).toBeInstanceOf(RateLimitError);
        expect((err as RateLimitError).retryAfterMs).toBe(5000);
    });

    it("maps 500 to ServerError", async () => {
        const err = await errorFromResponse(fakeResponse(500, { detail: "boom" }));
        expect(err).toBeInstanceOf(ServerError);
    });

    it("maps 502 to ServerError", async () => {
        const err = await errorFromResponse(fakeResponse(502, {}));
        expect(err).toBeInstanceOf(ServerError);
    });

    it("maps unknown status to generic OneclawError", async () => {
        const err = await errorFromResponse(fakeResponse(418, { detail: "teapot" }));
        expect(err).toBeInstanceOf(OneclawError);
        expect(err.type).toBe("unknown");
    });

    it("falls back to 'HTTP {status}' when body has no message", async () => {
        const err = await errorFromResponse(fakeResponse(500, {}));
        expect(err.message).toBe("HTTP 500");
    });

    it("reads message field as fallback", async () => {
        const err = await errorFromResponse(fakeResponse(400, { message: "from message" }));
        expect(err.message).toBe("from message");
    });

    it("handles non-JSON response gracefully", async () => {
        const res = {
            status: 500,
            ok: false,
            headers: new Headers(),
            json: () => Promise.reject(new Error("not json")),
        } as unknown as Response;
        const err = await errorFromResponse(res);
        expect(err.message).toBe("HTTP 500");
    });
});
