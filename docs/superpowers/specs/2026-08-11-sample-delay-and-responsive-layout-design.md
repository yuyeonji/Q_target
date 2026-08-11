# Sample Delay and Responsive Layout Design

## Goal

Keep data-dense alarm history unchanged while making the alarm-detail flow, sample-delay diagnosis, dashboard overdue card, target list, and master-management terminology easier to use at desktop size without vertical page scrolling.

## Scope

### 1. Alarm detail related information

- Keep the existing alarm detail header, basic information, measurements, impact assessment, and action footer.
- Replace the four low-visibility bottom navigation items with a `관련 정보` accordion in the scrollable detail body.
- The accordion has four individually bounded, keyboard-operable sections: `최근 유사 알람`, `과거 관리대상 내역`, `과거 조치 및 효과`, and `첨부파일`.
- One section is open at a time; `최근 유사 알람` is the default. The footer contains only alarm actions.
- Do not change the alarm-history list columns or remove information from that table.

### 2. Sample Delay alarm drawer

- When an alarm's type is `Sample Delay`, open a specialized drawer instead of the generic detail drawer.
- Show the workflow in this fixed order: `샘플 의뢰` → `시험 접수` → `시험 분석 완료` → `판정 지연`.
- Every stage displays its completion/request time and elapsed time.
- Visually emphasize the delayed stage in red and show elapsed time, allowed time, and overdue time in a summary alert.
- Below the flow, display the same stage durations in a compact list so precise values remain readable.
- Other alarm types retain the generic alarm drawer.

### 3. Dashboard overdue card

- Keep all three overdue target items visible.
- On desktop, use compact responsive padding, text sizing, and progress-bar height so the `기한 초과 관리대상` card fits its grid slot without clipping or page scrolling.
- Keep the mobile stacked layout readable; do not hide any item to solve overflow.

### 4. Target list screen

- At desktop heights, fit the page heading, KPI row, table, and pagination into the viewport without vertical page scrolling.
- Increase table page size based on viewport height so the available screen space is used; page buttons continue to navigate remaining items.
- Preserve the existing target table columns, filter, export control, action menu, and horizontal table reachability for narrow screens.

### 5. Language and status clarity

- Change mixed labels in the action-plan modal to Korean-first labels while retaining short English guidance only where it improves comprehension.
- Restyle active/inactive controls in master management as a clearly selected two-state toggle while retaining the existing explicit text and `aria-pressed` behavior.

## Interaction and accessibility

- Accordion headers are buttons with `aria-expanded` and `aria-controls`; their panels have matching IDs.
- Workflow stages use accessible text labels and do not depend only on color to identify the delay.
- Existing close, Escape, focus restoration, and footer behavior remain unchanged.

## Out of scope

- No backend, persistence, permission, export format, or alarm-history table-column changes.
- No change to existing non-Sample-Delay alarm content beyond the related-information accordion.

## Validation

- Extend source-level regression tests for generic versus Sample Delay drawer rendering, accessible accordion semantics, responsive target pagination, card sizing rules, Korean-first labels, and state controls.
- Run `node --test tests/rendered-html.test.mjs`, direct Vinext build, and `git diff --check`.
