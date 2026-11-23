# LINE personal-account plugin

This plugin connects to a personal LINE account through the upstream Yomi MCP server. It does not use the LINE Official Account Messaging API.

## Setup

1. Install this directory as a pi-web-ui plugin.
2. In LINE on your primary phone, enable **Settings → Account → Allow login on other devices**.
3. Open the LINE plugin view, enter your phone number in E.164 format and your region code (for example `+49...` and `DE`), then start login.
4. Enter the PIN shown by Yomi on your primary phone and select **Complete login**.
5. Select **Refresh chats**.

Yomi is started on demand with `npx --yes @rikaidev/yomi@0.7.5`. The first start requires internet access and downloads the npm package. Credentials are managed by Yomi, not copied into plugin settings.

## Agent workflow

The agent has three tools:

- `line_list_conversations` — read-only conversation listing.
- `line_get_chat_messages` — read-only message retrieval.
- `line_create_reply_draft` — save a German reply draft and target language.

The agent has no send tool. It must translate incoming messages into German, retain the original text, draft a response in German, and create a draft with the recipient's target language. The plugin view shows the draft. Only the user can approve or reject it.

Approval translates the exact saved German draft into the target language using the configured model, then calls Yomi `send_message`. If translation fails, nothing is sent. The plugin does not mark chats as read.

## Important limitations

- Yomi is unofficial and may violate LINE's terms. LINE may rate-limit or suspend accounts.
- Yomi uses LINE's secondary-device login. It can sign out the official LINE Desktop app; LINE allows only one desktop client session per account.
- LINE's E2EE group key epochs and secondary-device history restrictions apply.
- Yomi's Linux/Windows credential fallback is a local JSON file; secure the host account and data directory.
- Yomi requires Node.js 22.13+ and is pinned to version 0.7.5 by default.

Upstream: [RikaiDev/yomi](https://github.com/RikaiDev/yomi). See its README and PRIVACY.md for protocol, data-retention, and platform details.
