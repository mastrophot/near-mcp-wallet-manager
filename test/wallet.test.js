import { describe, expect, it } from "vitest";
import { classifyAccountId, createWallet, isValidAccountId } from "../src/wallet.js";
describe("wallet", () => {
    it("creates random wallet with implicit account", () => {
        const wallet = createWallet({ include_private_key: true, network: "testnet" });
        expect(wallet.public_key.startsWith("ed25519:")).toBe(true);
        expect(wallet.private_key?.startsWith("ed25519:")).toBe(true);
        expect(wallet.implicit_account_id).toMatch(/^[a-f0-9]{64}$/);
        expect(wallet.network).toBe("testnet");
    });
    it("imports wallet from private key", () => {
        const privateKey = "ed25519:hXrLAThudwqzsP7VE8ixUMygyH5KQ9pyjrpDwDHhzqmequ1a44NCurNowrKYHMKin5gqhjuAJp9xN4ackGYEvWo";
        const wallet = createWallet({ private_key: privateKey, include_private_key: false });
        expect(wallet.public_key).toBe("ed25519:EhZEWdRfstc8VHVbeMG1rGPgKYmyEzC8mjAb2cqxtZH5");
        expect(wallet.private_key).toBeUndefined();
        expect(wallet.implicit_account_id).toHaveLength(64);
    });
    it("validates account id types", () => {
        expect(classifyAccountId("near")).toBe("named");
        expect(classifyAccountId("deadbeef".repeat(8))).toBe("implicit");
        expect(isValidAccountId("test.near")).toBe(true);
        expect(isValidAccountId("INVALID!ID")).toBe(false);
    });
});
