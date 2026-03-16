import { describe, expect, it } from "vitest";
import { signTransaction } from "../src/signing.js";
describe("signTransaction", () => {
    it("signs a transfer transaction payload", () => {
        const signed = signTransaction({
            signer_id: "alice.testnet",
            signer_private_key: "ed25519:hXrLAThudwqzsP7VE8ixUMygyH5KQ9pyjrpDwDHhzqmequ1a44NCurNowrKYHMKin5gqhjuAJp9xN4ackGYEvWo",
            receiver_id: "bob.testnet",
            nonce: 7,
            recent_block_hash: "11111111111111111111111111111111",
            actions: [{ type: "transfer", deposit_yocto: "1" }]
        });
        expect(signed.signer_public_key).toBe("ed25519:EhZEWdRfstc8VHVbeMG1rGPgKYmyEzC8mjAb2cqxtZH5");
        expect(signed.actions_count).toBe(1);
        expect(signed.transaction_hash_base58.length).toBeGreaterThan(10);
        expect(signed.signature_base58.length).toBeGreaterThan(20);
        expect(signed.signed_transaction_base64.length).toBeGreaterThan(40);
        expect(signed.signed_transaction_size_bytes).toBeGreaterThan(0);
    });
    it("rejects invalid block hash", () => {
        expect(() => signTransaction({
            signer_id: "alice.testnet",
            signer_private_key: "ed25519:hXrLAThudwqzsP7VE8ixUMygyH5KQ9pyjrpDwDHhzqmequ1a44NCurNowrKYHMKin5gqhjuAJp9xN4ackGYEvWo",
            receiver_id: "bob.testnet",
            nonce: 1,
            recent_block_hash: "not-base58",
            actions: [{ type: "transfer", deposit_yocto: "1" }]
        })).toThrow(/invalid_recent_block_hash/);
    });
});
