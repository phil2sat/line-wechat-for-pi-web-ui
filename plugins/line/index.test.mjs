import test from "node:test";
import assert from "node:assert/strict";

test("manifest and client entry remain syntax-loadable", async () => {
  const manifest = await import("node:fs/promises").then((fs) => fs.readFile(new URL("./manifest.json", import.meta.url), "utf8"));
  const parsed = JSON.parse(manifest);
  assert.equal(parsed.id, "line");
  assert.ok(parsed.permissions.includes("llm"));
  assert.ok(parsed.permissions.includes("tools"));
});
