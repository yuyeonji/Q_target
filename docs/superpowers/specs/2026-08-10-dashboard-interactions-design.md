# Dashboard interaction updates

## Goal

Keep the integrated dashboard readable within the desktop viewport and make its analysis and alarm navigation predictable.

## Dashboard layout

- At desktop widths, the dashboard content uses the available viewport height beneath the top bar.
- KPI cards, charts, distribution, critical-alarm table, and overdue-target summary are reduced proportionally so the dashboard does not require vertical page scrolling.
- At narrow viewport widths, existing responsive stacking and scrolling remain available.

## Analysis details

- The category alarm-trend card and target-distribution card each expose an accessible overflow-menu button.
- Selecting the detail action opens one right-side analysis panel at a time.
- The trend panel shows a period-by-category data table and summary metrics.
- The distribution panel shows each status, its count and share, plus the matching target list.
- The panel closes with its close button or overlay interaction, without navigating away from the dashboard.

## Critical-alarm navigation

- Selecting the critical-alarm card's `View all` action switches directly to the alarm-history list.
- The list starts with the critical-alarm filter applied.
- No alarm detail drawer is opened by this navigation.

## Validation

- A component-level test covers direct alarm-list navigation and the absence of a selected alarm.
- Tests cover opening each analysis panel from its overflow action.
- The production build is run after the change.
