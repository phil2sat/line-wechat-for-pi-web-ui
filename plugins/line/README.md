# LINE personal-account plugin

This plugin connects to a personal LINE account using [OkLine](https://github.com/NiceDayZc/OkLine), an unofficial implementation of the protocol used by the LINE Chrome extension. It does not use the LINE Official Account Messaging API.

## Requirements

- Python 3.9+
- Node.js 18+
- Network access to PyPI and LINE during the first runtime setup and login

The plugin creates an isolated Python virtual environment under `~/.cache/pi-web-ui/line/venv` and installs the pinned `okline[qr]==2.9.2` package on first use. No global Python packages are installed.

## QR login

1. Install this directory as a pi-web-ui plugin.
2. Open the LINE plugin view and select **Start QR login**.
3. Scan the displayed QR code with the QR reader in the LINE smartphone app.
4. Confirm the PIN displayed by the plugin on the phone.
5. Select **Refresh chats** after login completes.

The QR URL includes the Curve25519 public key and E2EE version required by LINE. The PIN is part of LINE's secondary-device confirmation flow.

## Session storage

The session, including the E2EE keychain, is stored outside the repository at:

`~/.cache/pi-web-ui/line/session.json`

The file is created with owner-only permissions where supported. Treat it as a password: anyone who can read it can access the LINE account. The session is restored automatically when the plugin next uses the bridge. Token refreshes are persisted by OkLine.

The plugin does not require the phone to remain powered on after a successful secondary-device login. LINE can still revoke a session or require another device confirmation.

## Agent workflow

The agent has three tools:

- `line_list_conversations` — read-only conversation listing.
- `line_get_chat_messages` — read-only message retrieval and E2EE decryption.
- `line_create_reply_draft` — save a German reply draft and target language.

The agent has no send tool. It must translate incoming messages into German, retain the original text, draft a response in German, and create a draft with the recipient's target language. The plugin view shows the draft. Only the user can approve or reject it.

Approval translates the exact saved German draft into the target language and then calls OkLine to send it. If translation fails, nothing is sent. The plugin does not mark chats as read.

## Important limitations and security

- OkLine is an unofficial reverse-engineered client and is not affiliated with LINE.
- Using unofficial personal-account automation may violate LINE's Terms of Service. Rate limits, forced logout or account restrictions are possible.
- QR login creates a secondary-device session. The initial QR scan and PIN confirmation require the primary phone.
- E2EE decryption depends on the keychain captured during QR login. Some messages may remain undecryptable after peer or group key changes.
- The session file contains account credentials and E2EE keys. Protect the server account, backups and filesystem permissions.
- The plugin reads message history on demand; it does not currently run a live operation/SSE receiver.

Upstream implementation: [NiceDayZc/OkLine](https://github.com/NiceDayZc/OkLine).
