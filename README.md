# mcp-near-wallet-manager

MCP server for NEAR wallet operations with three production tools:
- `create_wallet`
- `check_balance`
- `sign_transaction`

Designed for agent workflows where wallets must be provisioned, checked, and used for deterministic signing.

## What This Delivers (Job Mapping)

1. **Wallet creation**
- Generates ED25519 keypair or imports existing private key
- Returns public key + implicit account id

2. **Balance checking**
- Fetches account balance over NEAR JSON-RPC
- Returns total/locked/available balances and key count

3. **Transaction signing**
- Signs NEAR transaction payloads with transfer/function_call actions
- Returns transaction hash, signature, and base64 signed transaction blob

## Install

```bash
npm install -g mcp-near-wallet-manager
```

## MCP Config Example (Claude Desktop)

```json
{
  "mcpServers": {
    "near-wallet-manager": {
      "command": "mcp-near-wallet-manager"
    }
  }
}
```

## Tool Inputs

### `create_wallet`
```json
{
  "network": "testnet",
  "include_private_key": true
}
```

### `check_balance`
```json
{
  "account_id": "near",
  "network": "mainnet"
}
```

### `sign_transaction`
```json
{
  "signer_id": "alice.testnet",
  "signer_private_key": "ed25519:...",
  "receiver_id": "bob.testnet",
  "nonce": "7",
  "recent_block_hash": "11111111111111111111111111111111",
  "actions": [
    {
      "type": "transfer",
      "deposit_yocto": "1"
    }
  ]
}
```

## Development

```bash
npm install
npm run check
```

## Security Notes

- `create_wallet` may return a private key: treat as sensitive secret.
- Never store private keys in plaintext logs.
- Use dedicated signer accounts and minimal permissions.

## Publish Targets

- npm package: `mcp-near-wallet-manager`
- Agent framework integration notes: `deliverables/agent-framework-integration.md`
- MCP Registry metadata: `server.json`

## License

MIT
