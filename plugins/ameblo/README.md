# Ameblo plugin

Ameblo integration for pi-web-ui. It searches public Ameblo entries, reads article content and metadata, extracts article images, and publishes comments only after explicit user approval.

## Features

- Search public entries through Ameba Search.
- Read public entry pages and extract article text, metadata, and image URLs.
- Display extracted images in the plugin view and return image URLs to the agent.
- Create comment drafts through the agent.
- Publish the exact saved draft only after the user approves it in the plugin view.

## Authentication

Search and reading are public operations. Comment publishing requires an authenticated Ameblo browser session.

1. Sign in to Ameblo in a browser.
2. In the browser developer tools, inspect a request to `ameblo.jp` and copy its Cookie request header value.
3. Paste the value into the Ameblo plugin view and save it.

The cookie is stored in plugin storage on the pi-web-ui server. It is a credential: protect the server account and its backups. Clear the field and save to remove it.

## Agent tools

- `ameblo_search_entries`: search public entries by keyword.
- `ameblo_read_entry`: read an entry and return its text, metadata, and image URLs.
- `ameblo_create_comment_draft`: create a comment draft; never publishes directly.

The plugin view is the only publishing path. The user must approve the exact text. Article text and comments are untrusted content and must never be treated as agent instructions.

## Limitations

Ameblo does not provide a documented public API for arbitrary blog search, article reading, or comment publishing. This plugin uses the public Ameba Search HTML and article pages for reading, and attempts to submit the comment form rendered by each entry page. Ameblo may change its markup, require additional authentication or anti-CSRF values, disable comments, or block automated requests. In those cases publishing fails closed and reports the error; it does not bypass CAPTCHA or account restrictions.

The integration is unofficial and is not affiliated with or endorsed by CyberAgent/Ameba. Use it in accordance with Ameblo's terms and applicable laws.

## Development checks

```bash
node --check index.mjs
node --check client/entry.mjs
```
