#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { checkBalance } from "./rpc.js";
import { signTransaction } from "./signing.js";
import { createWallet } from "./wallet.js";

const server = new Server(
  {
    name: "mcp-near-wallet-manager",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

const createWalletSchema = z.object({
  private_key: z.string().optional(),
  account_id: z.string().optional(),
  include_private_key: z.boolean().default(true),
  network: z.enum(["mainnet", "testnet", "custom"]).default("mainnet")
});

const checkBalanceSchema = z.object({
  account_id: z.string(),
  network: z.enum(["mainnet", "testnet", "custom"]).default("mainnet"),
  rpc_url: z.string().url().optional()
});

const transferActionSchema = z.object({
  type: z.literal("transfer"),
  deposit_yocto: z.string()
});

const functionCallActionSchema = z.object({
  type: z.literal("function_call"),
  method_name: z.string().min(1),
  args_json: z.unknown().optional(),
  args_base64: z.string().optional(),
  gas: z.string().optional(),
  deposit_yocto: z.string().optional()
});

const signTransactionSchema = z.object({
  signer_id: z.string(),
  signer_private_key: z.string(),
  receiver_id: z.string(),
  nonce: z.union([z.string(), z.number()]),
  recent_block_hash: z.string(),
  actions: z.array(z.union([transferActionSchema, functionCallActionSchema])).min(1)
});

function asText(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "create_wallet",
      description: "Create or import a NEAR wallet (keypair) and return implicit account info.",
      inputSchema: {
        type: "object",
        properties: {
          private_key: { type: "string", description: "Optional: import existing ed25519 private key" },
          account_id: { type: "string", description: "Optional named/implicit account id to associate" },
          include_private_key: { type: "boolean", default: true },
          network: { type: "string", enum: ["mainnet", "testnet", "custom"], default: "mainnet" }
        },
        required: []
      }
    },
    {
      name: "check_balance",
      description: "Check NEAR account balance and key stats via JSON-RPC.",
      inputSchema: {
        type: "object",
        properties: {
          account_id: { type: "string" },
          network: { type: "string", enum: ["mainnet", "testnet", "custom"], default: "mainnet" },
          rpc_url: { type: "string", format: "uri", description: "Required only when network=custom" }
        },
        required: ["account_id"]
      }
    },
    {
      name: "sign_transaction",
      description: "Sign a NEAR transaction payload (transfer/function_call actions) with an ED25519 private key.",
      inputSchema: {
        type: "object",
        properties: {
          signer_id: { type: "string" },
          signer_private_key: { type: "string" },
          receiver_id: { type: "string" },
          nonce: { oneOf: [{ type: "string" }, { type: "number" }] },
          recent_block_hash: { type: "string", description: "Base58 block hash (32-byte decoded)" },
          actions: {
            type: "array",
            items: {
              oneOf: [
                {
                  type: "object",
                  properties: {
                    type: { const: "transfer" },
                    deposit_yocto: { type: "string" }
                  },
                  required: ["type", "deposit_yocto"]
                },
                {
                  type: "object",
                  properties: {
                    type: { const: "function_call" },
                    method_name: { type: "string" },
                    args_json: {},
                    args_base64: { type: "string" },
                    gas: { type: "string" },
                    deposit_yocto: { type: "string" }
                  },
                  required: ["type", "method_name"]
                }
              ]
            }
          }
        },
        required: ["signer_id", "signer_private_key", "receiver_id", "nonce", "recent_block_hash", "actions"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = request.params.name;
  const args = request.params.arguments ?? {};

  try {
    if (tool === "create_wallet") {
      const input = createWalletSchema.parse(args);
      return asText(createWallet(input));
    }

    if (tool === "check_balance") {
      const input = checkBalanceSchema.parse(args);
      return asText(await checkBalance(input));
    }

    if (tool === "sign_transaction") {
      const input = signTransactionSchema.parse(args);
      return asText(signTransaction(input));
    }

    return {
      isError: true,
      content: [{ type: "text", text: JSON.stringify({ error: "unknown_tool", tool }, null, 2) }]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      isError: true,
      content: [{ type: "text", text: JSON.stringify({ error: "tool_error", message }, null, 2) }]
    };
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("mcp-near-wallet-manager failed:", error);
  process.exit(1);
});
