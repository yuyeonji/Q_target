# Complete Demo Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make all remaining visible Q-Target demo controls produce meaningful in-memory behavior.

**Architecture:** Keep interactive state in app/page.tsx, extending the established controlled-prop pattern. The page remains a single-client demo: seeded datasets are transformed in React state and exported locally as CSV.

**Tech Stack:** React, TypeScript, Vinext, Node test runner.

## Global Constraints

- No API, database, authentication, persistence, or real file uploads.
- State changes reset on browser refresh.
- Preserve the industrial Q-Target visual language and current core workflows.

---

### Task 1: Dashboard controls and top-level panels

**Files:**
- Modify: app/page.tsx
- Modify: app/globals.css
- Test: tests/rendered-html.test.mjs

**Interfaces:**
- Produces: dashboardFilters, notificationOpen, and settingsOpen state held by Home.
- Produces: Dashboard callbacks for period/factory/product selection and KPI navigation.

- [ ] **Step 1: Write the failing test**

    assert.match(source, /최근 7일/);
    assert.match(source, /알림 센터/);
    assert.match(source, /표시 설정/);

- [ ] **Step 2: Run the test to verify it fails**

Run: node --test tests/rendered-html.test.mjs

Expected: FAIL because the panel labels do not exist.

- [ ] **Step 3: Implement dashboard selects and panels**

Replace static period/factory/product buttons with controlled selects. Add a notification popover and a settings dialog with display-density and notification switches. Route KPI/card clicks to the existing alarm/target views with a suitable status filter.

- [ ] **Step 4: Run the test to verify it passes**

Run: pnpm run build && node --test tests/rendered-html.test.mjs

Expected: build succeeds and all test cases pass.

- [ ] **Step 5: Commit**

    git add app/page.tsx app/globals.css tests/rendered-html.test.mjs
    git commit -m "feat: activate dashboard controls"

### Task 2: Detail, master, and task controls

**Files:**
- Modify: app/page.tsx
- Modify: app/globals.css
- Test: tests/rendered-html.test.mjs

**Interfaces:**
- Consumes: existing downloadCsv, rules, ActionPlan, and AlarmDrawer props.
- Produces: seeded master records by tab, alarm-detail tab content, attachment names, and task draft owner/date state.

- [ ] **Step 1: Write the failing test**

    assert.match(source, /첨부 파일 추가/);
    assert.match(source, /담당자 선택/);
    assert.match(source, /전환 규칙/);

- [ ] **Step 2: Run the test to verify it fails**

Run: node --test tests/rendered-html.test.mjs

Expected: FAIL because attachment and tab-specific content are absent.

- [ ] **Step 3: Implement contextual controls**

Give each master tab its own records and CSV export. Render selected alarm-drawer tab content, including a demo attachment action. Replace task-owner/date placeholder cells with controlled selects and carry selected values into newly added tasks.

- [ ] **Step 4: Run the test to verify it passes**

Run: pnpm run build && node --test tests/rendered-html.test.mjs

Expected: build succeeds and all test cases pass.

- [ ] **Step 5: Commit**

    git add app/page.tsx app/globals.css tests/rendered-html.test.mjs
    git commit -m "feat: activate detail and master controls"

### Task 3: Target pagination, support surfaces, and end-to-end verification

**Files:**
- Modify: app/page.tsx
- Modify: app/globals.css
- Test: tests/rendered-html.test.mjs

**Interfaces:**
- Consumes: TargetList target data and top-level notice handler.
- Produces: a controlled target-page selector and informational support/log panels.

- [ ] **Step 1: Write the failing test**

    assert.match(source, /다음 페이지/);
    assert.match(source, /고객지원 센터/);
    assert.match(source, /시스템 로그/);

- [ ] **Step 2: Run the test to verify it fails**

Run: node --test tests/rendered-html.test.mjs

Expected: FAIL because those interaction labels do not exist.

- [ ] **Step 3: Implement local paging and informational panels**

Page target rows in local state with accessible previous/next buttons. Give support and log controls small seeded information panels. Add responsive CSS for the new controls.

- [ ] **Step 4: Verify in browser**

Run the local app and verify dashboard selection, notification/settings panels, master tab/export, attachment action, task owner/date, target pagination, and no console errors.

- [ ] **Step 5: Commit and deploy**

    git add app/page.tsx app/globals.css tests/rendered-html.test.mjs
    git commit -m "feat: complete interactive demo controls"

Package the verified current commit, deploy a private Sites version, then update the corresponding GitHub files on yuyeonji/Q_target.
