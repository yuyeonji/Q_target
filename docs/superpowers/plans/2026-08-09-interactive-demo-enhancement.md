# Q-Target 인터랙티브 데모 보강 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 Q-Target 화면 데모를 목록 조작과 데이터 반영이 가능한 인터랙티브 데모로 보강한다.

**Architecture:** `app/page.tsx`의 데모 데이터를 객체 배열과 React 상태로 관리한다. 공용 검색어·필터·모달 상태를 상위 컴포넌트가 소유하고, 각 화면은 필터링된 데이터와 갱신 콜백을 받는다.

**Tech Stack:** React, TypeScript, Vinext, CSS, Node test.

## Global Constraints

- 모든 변경은 브라우저 메모리에만 유지한다.
- 검색·필터는 현재 보이는 목록 데이터를 실제로 변경해야 한다.
- 생성·수정·상태 변경은 성공 안내와 화면 내 결과를 남겨야 한다.
- 서버 API, 인증, 영구 저장은 추가하지 않는다.

---

### Task 1: 검증 기준 확장

**Files:**
- Modify: `tests/rendered-html.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
assert.match(html, /필터/);
assert.match(html, /내보내기/);
assert.match(html, /신규 케이스/);
assert.match(html, /규칙 추가/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run build && node --test tests/rendered-html.test.mjs`
Expected: FAIL until the interactive controls are rendered by the final app.

### Task 2: 알람과 관리대상 목록 조작

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Implement list state and filtering**

```tsx
const [alarmFilter, setAlarmFilter] = useState<AlarmStatus | "전체">("전체");
const filteredAlarms = alarms.filter((alarm) => alarmFilter === "전체" || alarm.status === alarmFilter);
```

- [ ] **Step 2: Implement CSV export and empty states**

```tsx
const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
const href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" }));
```

- [ ] **Step 3: Verify search, filter, and export in the browser**

### Task 3: 생성·편집·상태 반영

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Implement new-case modal and target creation**
- [ ] **Step 2: Implement master-rule creation, threshold editing, and activation toggle**
- [ ] **Step 3: Implement alarm outcome and action-plan save state changes**
- [ ] **Step 4: Verify each action changes visible data in the browser**

### Task 4: Final validation and publication

**Files:**
- Modify: `tests/rendered-html.test.mjs`
- Modify: `app/page.tsx`

- [ ] **Step 1: Run the production build and server-render test**
- [ ] **Step 2: Verify the complete browser flow and error console**
- [ ] **Step 3: Commit and update the GitHub repository and private demo deployment**
