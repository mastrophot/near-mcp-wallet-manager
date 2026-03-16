import { KeyPair, keyToImplicitAddress } from "near-api-js";

export type NearNetwork = "mainnet" | "testnet" | "custom";

export interface CreateWalletInput {
  private_key?: string;
  account_id?: string;
  include_private_key?: boolean;
  network?: NearNetwork;
}

export interface WalletOutput {
  network: NearNetwork;
  public_key: string;
  private_key?: string;
  implicit_account_id: string;
  account_id?: string;
  account_id_type: "implicit" | "named";
  warning: string;
}

const NAMED_ACCOUNT_RE = /^(?=.{2,64}$)([a-z0-9]+[-_])*[a-z0-9]+(\.([a-z0-9]+[-_])*[a-z0-9]+)*$/;
const IMPLICIT_ACCOUNT_RE = /^[a-f0-9]{64}$/;

export function classifyAccountId(accountId: string): "implicit" | "named" {
  if (IMPLICIT_ACCOUNT_RE.test(accountId)) {
    return "implicit";
  }
  if (!NAMED_ACCOUNT_RE.test(accountId)) {
    throw new Error("invalid_account_id: account_id must be a valid NEAR named or implicit account");
  }
  return "named";
}

export function createWallet(input: CreateWalletInput = {}): WalletOutput {
  const includePrivate = input.include_private_key ?? true;
  const network = input.network ?? "mainnet";

  const keyPair = input.private_key
    ? KeyPair.fromString(asNearPrivateKey(input.private_key))
    : KeyPair.fromRandom("ed25519");

  const publicKey = keyPair.getPublicKey().toString();
  const implicitAccountId = keyToImplicitAddress(publicKey);

  const result: WalletOutput = {
    network,
    public_key: publicKey,
    implicit_account_id: implicitAccountId,
    account_id_type: "implicit",
    warning:
      "Store private_key securely. Do not expose it in logs, public repos, or plaintext chat history."
  };

  if (includePrivate) {
    result.private_key = keyPair.toString();
  }

  if (input.account_id) {
    result.account_id = input.account_id;
    result.account_id_type = classifyAccountId(input.account_id);
  }

  return result;
}

function asNearPrivateKey(value: string): `ed25519:${string}` | `secp256k1:${string}` {
  if (!(value.startsWith("ed25519:") || value.startsWith("secp256k1:"))) {
    throw new Error("invalid_private_key_format: expected ed25519:... or secp256k1:...");
  }
  return value as `ed25519:${string}` | `secp256k1:${string}`;
}

export function isValidAccountId(accountId: string): boolean {
  try {
    classifyAccountId(accountId);
    return true;
  } catch {
    return false;
  }
}
