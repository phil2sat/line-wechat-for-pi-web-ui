import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("WeChat connector defaults to manual, approval-gated operation", async () => {
  const manifest = JSON.parse(await readFile(new URL("./manifest.json", import.meta.url), "utf8"));
  const settings = Object.fromEntries(manifest.settings.map((setting) => [setting.key, setting.default]));
  const source = await readFile(new URL("./index.mjs", import.meta.url), "utf8");
  assert.equal(settings.autoDrive, false);
  assert.equal("aiSend" in settings, false);
  assert.ok(manifest.permissions.includes("llm"));
  assert.match(source, /wechat_create_reply_draft/);
  assert.match(source, /approve_draft/);
  assert.doesNotMatch(source, /name: "wechat_send"/);
});
