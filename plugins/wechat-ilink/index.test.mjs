import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("WeChat connector defaults to manual, approval-gated operation", async () => {
  const manifest = JSON.parse(await readFile(new URL("./manifest.json", import.meta.url), "utf8"));
  const settings = Object.fromEntries(manifest.settings.map((setting) => [setting.key, setting.default]));
  assert.equal(settings.autoDrive, false);
  assert.equal(settings.aiSend, false);
  assert.ok(manifest.permissions.includes("llm"));
});
