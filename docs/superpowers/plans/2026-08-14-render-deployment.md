# Render Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Q-Target repository directly deployable as a Render Node Web Service while keeping the Neon connection string secret-managed outside Git.

**Architecture:** Add a single Render Blueprint file that declares the Node runtime, GitHub `main` auto-deploy, the existing Vinext build/start commands, a root health check, and a manually supplied `DATABASE_URL` secret. The application continues using its current server-side Neon database helper; no Cloudflare Worker or D1 runtime is introduced.

**Tech Stack:** Render Blueprint, Node.js 22.13+, Vinext, Vite, Neon PostgreSQL, Drizzle ORM.

## Global Constraints

- Deploy as a Render `web` service; do not deploy to Cloudflare Workers.
- Preserve the existing Neon database, schema, and all current records.
- Never commit the actual `DATABASE_URL` or any `.dev.vars` content.
- Use GitHub branch `main` for automatic deployment.
- Keep the existing `vinext build` and `vinext start` runtime flow.

---

### Task 1: Add the Render deployment blueprint

**Files:**
- Create: `render.yaml`
- Test: `tests/render-deployment.test.mjs`

**Interfaces:**
- Consumes: Render's Blueprint format and the repository's existing `package.json` scripts.
- Produces: `render.yaml`, which Render imports to create a Node web service and request a user-supplied `DATABASE_URL` secret.

- [ ] **Step 1: Write the failing test**

Create `tests/render-deployment.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/render-deployment.test.mjs`

Expected: FAIL because `render.yaml` does not exist.

- [ ] **Step 3: Add the minimal Render configuration**

Create `render.yaml`:

```yaml
services:
  - type: web
    name: q-target
    runtime: node
    branch: main
    buildCommand: npm ci && npx vinext build
    startCommand: npx vinext start --port $PORT
    healthCheckPath: /
    autoDeploy: true
    envVars:
      - key: NODE_VERSION
        value: 22.13.0
      - key: DATABASE_URL
        sync: false
```

- [ ] **Step 4: Run the blueprint test to verify it passes**

Run: `node --test tests/render-deployment.test.mjs`

Expected: PASS with one passing test.

- [ ] **Step 5: Run the production validation suite**

Run: `npx vinext build && node --test tests/*.test.mjs`

Expected: Vinext build completes and every test passes.

- [ ] **Step 6: Commit the deployment configuration**

```bash
git add render.yaml tests/render-deployment.test.mjs
git diff --cached --check
git commit -m "chore: add Render deployment configuration"
```

### Task 2: Publish the prepared deployment configuration

**Files:**
- Modify: GitHub branch `main` through a push of the Task 1 commit.

**Interfaces:**
- Consumes: The validated Task 1 commit.
- Produces: A GitHub `main` branch that Render can import.

- [ ] **Step 1: Confirm the only staged commit is the validated deployment configuration**

Run: `git show --stat --oneline HEAD`

Expected: Only `render.yaml` and `tests/render-deployment.test.mjs` appear for the deployment configuration commit.

- [ ] **Step 2: Push `main` to GitHub**

Run: `git push origin main`

Expected: Git reports that `main` was updated on `https://github.com/yuyeonji/Q_target.git`.

- [ ] **Step 3: Hand off the Render dashboard action**

Tell the user to import the GitHub repository in Render and enter the existing Neon connection string as the `DATABASE_URL` value. Do not ask the user to paste the connection string into chat or commit it to the repository.
