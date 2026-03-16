import { describe, expect, it } from "vitest";
import { resolveRpcUrl } from "../src/rpc.js";
describe("resolveRpcUrl", () => {
    it("uses default network RPC", () => {
        expect(resolveRpcUrl("mainnet")).toBe("https://rpc.mainnet.near.org");
        expect(resolveRpcUrl("testnet")).toBe("https://rpc.testnet.near.org");
    });
    it("allows custom rpc override", () => {
        expect(resolveRpcUrl("mainnet", "https://example-rpc")).toBe("https://example-rpc");
    });
    it("requires rpc_url for custom network", () => {
        expect(() => resolveRpcUrl("custom")).toThrow(/rpc_url_required/);
    });
});
