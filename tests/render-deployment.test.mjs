import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("declares a Render Node web service without committing a database URL", async () => {
  const source = await readFile(new URL("../render.yaml", import.meta.url), "utf8");

  assert.match(source, /type:\s*web/);
  assert.match(source, /branch:\s*main/);
  assert.match(source, /buildCommand:\s*npm ci && npx vinext build/);
  assert.match(source, /startCommand:\s*npx vinext start --port \$PORT/);
  assert.match(source, /healthCheckPath:\s*\//);
  assert.match(source, /key:\s*DATABASE_URL[\s\S]*sync:\s*false/);
  assert.doesNotMatch(source, /postgres(?:ql)?:\/\//i);
});
