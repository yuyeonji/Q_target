# Complete demo controls design

## Goal

Convert every visible primary control in the Q-Target demo from a static element
or toast-only response into a meaningful, browser-memory interaction. This remains
a demo: data resets on refresh and no external system or database is introduced.

## Interaction model

- Dashboard period, factory, and product controls become native selects. Their
  choices update the KPI labels, chart caption, and critical-alarm summary.
- Dashboard cards and critical-alarm rows route to the relevant list with an
  appropriate status filter.
- The notification button opens a compact notification panel; settings opens a
  preferences dialog containing display-density and notification switches.
- The support and log entries open informational drawers rather than doing nothing.
- Master tabs each show their own seeded rule data. All three tabs support CSV
  export, creation, rename, and active-status changes.
- Alarm detail tabs replace the body beneath the header with seeded contextual
  content. The attachment tab supports a demo file-add action.
- Action-plan task rows use selectable owner and due-date inputs. Adding a task
  carries those selected values into the table. The table pagination switches
  between two local pages of target rows.

## Boundaries

- Existing core controls (search, status filters, CSV export, new case, rules,
  alarm status changes, and plan saving) stay intact.
- No authentication, real uploads, API calls, persistence, or notifications are
  added. Every mutation is in React state.
- Existing desktop-oriented reference layout remains the visual baseline; new
  controls use the same neutral, high-contrast panel styling.

## Data and state

The page owns typed local state for dashboard filters, notification/settings
visibility, master-tab records, selected alarm-detail tab, demo attachment names,
task draft owner/date, and the target-list page. Components receive state and
callbacks through explicit props.

## Error handling

- Empty rule, case, and task names retain the existing inline toast message.
- CSV export with no matching rows reports that no exportable rows exist.
- Attachment action only records an example filename; it never claims to upload.

## Verification

1. Add source-level regression assertions for every newly interactive control.
2. Build and execute the Node test suite.
3. In browser, select dashboard filters, open notification/settings, navigate from
   a KPI, switch master and detail tabs, create a task with owner/date, and change
   pagination.
4. Confirm that the browser console has no errors.
