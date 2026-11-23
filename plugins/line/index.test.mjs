import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("manifest declares the personal LINE plugin and required permissions", async () => {
  const manifest = JSON.parse(await read("./manifest.json"));
  assert.equal(manifest.id, "line");
  assert.ok(manifest.permissions.includes("llm"));
  assert.ok(manifest.permissions.includes("tools"));
  assert.equal(manifest.settings.some((setting) => setting.key === "yomiVersion"), false);
});

test("LINE backend uses OkLine QR login and keeps sending behind approval", async () => {
  const source = await read("./index.mjs");
  assert.match(source, /okline\[qr\]/);
  assert.match(source, /line_create_reply_draft/);
  assert.match(source, /action === "approve"/);
  assert.match(source, /send_message/);
  assert.doesNotMatch(source, /@rikaidev\/yomi|YomiClient|yomi\.call/);
  assert.doesNotMatch(source, /name:\s*"line_send_message"/);
});

test("QR bridge persists the session and exposes no direct send command", async () => {
  const source = await read("./bridge.py");
  assert.match(source, /qr_login/);
  assert.match(source, /save_tokens/);
  assert.match(source, /chmod\(SESSION_PATH, 0o600\)/);
  assert.match(source, /get_recent_messages/);
  assert.match(source, /client\.send_text/);
  assert.match(source, /if action == "send_message"/);
});

test("client view renders the QR code and login confirmation PIN", async () => {
  const source = await read("./client/entry.mjs");
  assert.match(source, /data-ref="qr-image"/);
  assert.match(source, /data-ref="pin"/);
  assert.match(source, /Start QR login/);
});
