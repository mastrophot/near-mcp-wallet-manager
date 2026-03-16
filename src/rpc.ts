import { JsonRpcProvider, formatNearAmount } from "near-api-js";

import { isValidAccountId, type NearNetwork } from "./wallet.js";

export interface CheckBalanceInput {
  account_id: string;
  network?: NearNetwork;
  rpc_url?: string;
}

export interface CheckBalanceOutput {
  account_id: string;
  network: NearNetwork;
  rpc_url: string;
  amount_yocto: string;
  locked_yocto: string;
  storage_usage: number;
  available_yocto: string;
  amount_near: string;
  locked_near: string;
  available_near: string;
  code_hash: string;
  access_keys_count: number;
}

const DEFAULT_RPC_BY_NETWORK: Record<Exclude<NearNetwork, "custom">, string> = {
  mainnet: "https://rpc.mainnet.near.org",
  testnet: "https://rpc.testnet.near.org"
};

export function resolveRpcUrl(network: NearNetwork, customUrl?: string): string {
  if (network === "custom") {
    if (!customUrl) {
      throw new Error("rpc_url_required: provide rpc_url when network=custom");
    }
    return customUrl;
  }
  return customUrl ?? DEFAULT_RPC_BY_NETWORK[network];
}

export async function checkBalance(input: CheckBalanceInput): Promise<CheckBalanceOutput> {
  if (!isValidAccountId(input.account_id)) {
    throw new Error("invalid_account_id: account_id must be a valid NEAR account");
  }

  const network = input.network ?? "mainnet";
  const rpcUrl = resolveRpcUrl(network, input.rpc_url);
  const provider = new JsonRpcProvider({ url: rpcUrl });

  const [account, keys] = await Promise.all([
    provider.viewAccount({ accountId: input.account_id }),
    provider.viewAccessKeyList({ accountId: input.account_id })
  ]);

  const amount = BigInt(account.amount.toString());
  const locked = BigInt(account.locked.toString());
  const available = amount - locked;

  return {
    account_id: input.account_id,
    network,
    rpc_url: rpcUrl,
    amount_yocto: amount.toString(),
    locked_yocto: locked.toString(),
    storage_usage: account.storage_usage,
    available_yocto: available.toString(),
    amount_near: formatNearAmount(amount.toString(), 5),
    locked_near: formatNearAmount(locked.toString(), 5),
    available_near: formatNearAmount(available.toString(), 5),
    code_hash: account.code_hash,
    access_keys_count: keys.keys.length
  };
}
