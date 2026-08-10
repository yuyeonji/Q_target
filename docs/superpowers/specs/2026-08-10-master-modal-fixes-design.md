# Modal and master-management fixes

## Modal layout

- The alarm-detail drawer separates its scrollable content from a fixed in-drawer action footer; no content or button may overlap.
- The management-target action-plan modal displays the primary bottom-right action as `저장 및 승인 요청`.

## Master management

- Each rule row supports editing its name, scope, and threshold together.
- Active and inactive states use an explicit coloured toggle with text rather than a low-contrast badge.
- Alarm rules, conversion rules, and code management have separate datasets, columns, creation controls, and editing behavior.
- Tab changes preserve the selected tab and show only that tab's own management surface.

## Validation

- Source-level regression tests cover fixed modal actions, rule-edit fields, state toggles, and distinct tab surfaces.
- Run the Vinext build and rendered HTML tests.
