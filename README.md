# LINE + WeChat for pi-web-ui

A personal-account messaging connector pack for pi-web-ui. It supports **reading and sending** through both LINE and WeChat, with separate provider adapters.

| Provider | Personal-account transport | Read | Draft | Send |
|---|---|---:|---:|---:|
| LINE | [Yomi](https://github.com/RikaiDev/yomi) MCP server | Yes | Yes | After explicit approval |
| WeChat | WeChat iLink protocol | Yes | Yes | After explicit approval by default |

## Plugins

### LINE personal account

Path: `plugins/line/`

- Uses Yomi; it does not use the LINE Official Account Messaging API.
- Passwordless secondary-device login from the plugin view.
- Agent tools for listing conversations, reading messages, and creating German reply drafts.
- Incoming messages are to be translated into German by the agent; original text remains available.
- The user reviews a draft and explicitly approves the exact draft.
- Only after approval does the plugin translate the approved German text into the recipient's language and send it through the personal LINE account.
- No direct LINE send tool is exposed to the agent.

See [LINE plugin setup](./plugins/line/README.md).

### WeChat personal account

Path: `plugins/wechat-ilink/`

- Based on the upstream pi-web-ui WeChat iLink plugin.
- QR login, outbound long polling, inbox, media handling, and personal-account sending.
- Agent tools expose recent inbox messages and create German reply drafts.
- The plugin view requires explicit approval, translates the approved draft, then sends it.
- Automatic agent-driving remains disabled by default, and no direct agent-send tool is registered.

See [WeChat plugin documentation](./plugins/wechat-ilink/README.en.md).

## Installation

Copy either or both plugin directories into the pi-web-ui plugin directory, enable them, and reload plugins.

## Important provider limitations

- **LINE/Yomi:** unofficial personal-account client; may violate LINE terms or cause rate limiting/account suspension. LINE permits only one desktop client session per account, so Yomi can sign out the official LINE Desktop app. E2EE group history depends on Letter Sealing key epochs. On Linux/Windows Yomi currently documents a local JSON credential-store fallback.
- **WeChat iLink:** unofficial personal-account automation path; provider behavior and account restrictions may change. Use a secondary account first.
- Neither implementation is affiliated with or endorsed by LINE Corporation or Tencent.

## Development checks

From each plugin directory:

```bash
node --check index.mjs
node --check client/entry.mjs
node --test
```

LINE requires Node.js 22.13+ for the pinned Yomi release. Yomi is installed on demand through npm on first use.
