# Agent Framework Integration Notes

## Claude Desktop / MCP-compatible clients
Use stdio server command:
- `mcp-near-wallet-manager`

## LangChain agent integration
Expose MCP tools:
- `create_wallet`
- `check_balance`
- `sign_transaction`

Recommended flow:
1. Generate/import wallet (`create_wallet`)
2. Validate funding (`check_balance`)
3. Sign transaction payload (`sign_transaction`)

## OpenClaw / custom orchestrators
Register toolset as wallet capability pack:
- wallet provisioning
- balance telemetry
- transaction signing

Security baseline:
- Never persist private keys in plaintext logs
- Use ephemeral key handling where possible
- Keep signing isolated from prompt text history
