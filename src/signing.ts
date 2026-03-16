import { createHash } from "node:crypto";

import bs58 from "bs58";
import {
  KeyPair,
  Signature,
  SignedTransaction,
  actions,
  createTransaction,
  encodeTransaction
} from "near-api-js";

import { isValidAccountId } from "./wallet.js";

type TransferActionInput = {
  type: "transfer";
  deposit_yocto: string;
};

type FunctionCallActionInput = {
  type: "function_call";
  method_name: string;
  args_json?: unknown;
  args_base64?: string;
  gas?: string;
  deposit_yocto?: string;
};

export type TxActionInput = TransferActionInput | FunctionCallActionInput;

export interface SignTransactionInput {
  signer_id: string;
  signer_private_key: string;
  receiver_id: string;
  nonce: string | number;
  recent_block_hash: string;
  actions: TxActionInput[];
}

export interface SignTransactionOutput {
  signer_id: string;
  signer_public_key: string;
  receiver_id: string;
  nonce: string;
  recent_block_hash: string;
  actions_count: number;
  transaction_hash_base58: string;
  transaction_hash_hex: string;
  signature_base58: string;
  signed_transaction_base64: string;
  signed_transaction_size_bytes: number;
}

function requireAccountId(accountId: string, field: string): void {
  if (!isValidAccountId(accountId)) {
    throw new Error(`invalid_${field}: expected valid NEAR account id`);
  }
}

function toPositiveNonce(value: string | number): bigint {
  const nonce = BigInt(value);
  if (nonce <= 0n) {
    throw new Error("invalid_nonce: nonce must be > 0");
  }
  return nonce;
}

function decodeBlockHash(base58Hash: string): Uint8Array {
  let decoded: Uint8Array;
  try {
    decoded = bs58.decode(base58Hash);
  } catch {
    throw new Error("invalid_recent_block_hash: expected base58 block hash");
  }
  if (decoded.length !== 32) {
    throw new Error("invalid_recent_block_hash: decoded block hash must be 32 bytes");
  }
  return decoded;
}

function parseAction(input: TxActionInput) {
  if (input.type === "transfer") {
    const deposit = BigInt(input.deposit_yocto);
    if (deposit < 0n) {
      throw new Error("invalid_transfer_deposit: deposit_yocto must be >= 0");
    }
    return actions.transfer(deposit);
  }

  if (!input.method_name || input.method_name.trim().length === 0) {
    throw new Error("invalid_function_call_method: method_name is required");
  }

  let argsBytes: Uint8Array;
  if (input.args_base64) {
    argsBytes = Buffer.from(input.args_base64, "base64");
  } else {
    const payload = input.args_json ?? {};
    argsBytes = Buffer.from(JSON.stringify(payload));
  }

  const gas = BigInt(input.gas ?? "30000000000000");
  const deposit = BigInt(input.deposit_yocto ?? "0");

  if (gas <= 0n) {
    throw new Error("invalid_function_call_gas: gas must be > 0");
  }
  if (deposit < 0n) {
    throw new Error("invalid_function_call_deposit: deposit_yocto must be >= 0");
  }

  return actions.functionCall(input.method_name, argsBytes, gas, deposit);
}

export function signTransaction(input: SignTransactionInput): SignTransactionOutput {
  requireAccountId(input.signer_id, "signer_id");
  requireAccountId(input.receiver_id, "receiver_id");

  if (!Array.isArray(input.actions) || input.actions.length === 0) {
    throw new Error("invalid_actions: provide at least one action");
  }

  const keyPair = KeyPair.fromString(asNearPrivateKey(input.signer_private_key));
  const publicKey = keyPair.getPublicKey();
  const nonce = toPositiveNonce(input.nonce);
  const blockHash = decodeBlockHash(input.recent_block_hash);
  const txActions = input.actions.map(parseAction);

  const tx = createTransaction(input.signer_id, publicKey, input.receiver_id, nonce, txActions, blockHash);

  const encodedTx = encodeTransaction(tx);
  const txHash = createHash("sha256").update(Buffer.from(encodedTx)).digest();

  const signed = keyPair.sign(new Uint8Array(txHash));
  const signature = new Signature({
    keyType: tx.publicKey.keyType,
    data: signed.signature
  });

  const signedTx = new SignedTransaction({ transaction: tx, signature });
  const signedBytes = signedTx.encode();

  return {
    signer_id: input.signer_id,
    signer_public_key: publicKey.toString(),
    receiver_id: input.receiver_id,
    nonce: nonce.toString(),
    recent_block_hash: input.recent_block_hash,
    actions_count: input.actions.length,
    transaction_hash_base58: bs58.encode(txHash),
    transaction_hash_hex: Buffer.from(txHash).toString("hex"),
    signature_base58: bs58.encode(signed.signature),
    signed_transaction_base64: Buffer.from(signedBytes).toString("base64"),
    signed_transaction_size_bytes: signedBytes.length
  };
}

function asNearPrivateKey(value: string): `ed25519:${string}` | `secp256k1:${string}` {
  if (!(value.startsWith("ed25519:") || value.startsWith("secp256k1:"))) {
    throw new Error("invalid_private_key_format: expected ed25519:... or secp256k1:...");
  }
  return value as `ed25519:${string}` | `secp256k1:${string}`;
}
