# LINE + WeChat for pi-web-ui

A two-channel personal-account connector pack for pi-web-ui.

- **WeChat:** the upstream `wechat-ilink` plugin, retained as a separate adapter.
- **LINE:** a personal-account connector powered by [Yomi](https://github.com/RikaiDev/yomi), not the LINE Official Account Messaging API.

Both adapters are designed around human-reviewed replies. The LINE adapter exposes read-only conversation tools and a draft tool to the agent. Sending is deliberately not exposed as an agent tool: the user must approve a specific draft in the plugin view.

## Installation

Copy the desired plugin directory into pi-web-ui's plugin directory:

- `plugins/line` for personal LINE accounts.
- `plugins/wechat-ilink` for WeChat iLink accounts.

Enable the plugin and reload plugins.

## LINE workflow

1. Start Yomi from the plugin view and complete its passwordless secondary-device login.
2. Read conversations and messages with the agent tools.
3. The agent translates incoming messages into German and creates a German reply draft with the target language recorded.
4. Review and approve or reject the exact draft in the plugin view.
5. On approval, the plugin translates the approved German text into the target language and sends it through the personal LINE account.
6. The translated outgoing text and send result are shown in the view.

The agent cannot send LINE messages directly. Approval is bound to one immutable draft ID and exact text. Editing or replacing a draft creates a new approval target.

## Requirements

- pi-web-ui with plugin SDK API support for `registerAgentTool`, `onClientMessage`, `llm.complete`, `storage`, and `secrets`.
- Node.js 22.13 or newer.
- LINE account with secondary-device login enabled.
- Internet access for the first Yomi package installation.

Yomi is launched with `npx --yes @rikaidev/yomi@0.7.5`. Its own credential storage and protocol implementation remain upstream-owned.

## Security and limitations

- Yomi is an unofficial personal-account client, not affiliated with LINE Corporation. Use at your own risk.
- Yomi may sign out the official LINE Desktop client because LINE permits only one desktop session per account.
- On Linux and Windows, Yomi documents a local JSON credential-store fallback; protect the host and its data directory.
- LINE message history and E2EE visibility are subject to LINE's secondary-device and Letter Sealing limitations.
- The WeChat adapter is based on the upstream iLink implementation. Its automatic agent-driving and AI-send settings are disabled by default in this pack; manual operation remains available.
- This repository does not claim that either provider's unofficial protocol is supported or endorsed by its vendor.

## Development

Run the built-in checks from each plugin directory:

```bash
node --check index.mjs
node --check client/entry.mjs
node --test
```

See each plugin's README for provider-specific setup.
