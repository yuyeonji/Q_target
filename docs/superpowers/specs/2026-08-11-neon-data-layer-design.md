# Neon Data Layer Design

## Goal

Replace in-memory demo data with a development Neon PostgreSQL database so alarms, management targets, action plans, sample-delay stages, and audit history can persist through page reloads.

## Environments and secrets

- Create a development Neon database named `q-target-dev` in a region close to the primary users.
- Reserve a separate `q-target-prod` database for future production deployment; do not create or use it in this phase.
- Store the Neon connection string only as `DATABASE_URL` in local/Cloudflare secret configuration. Never commit it, add it to source files, or place it in GitHub.
- Use `@neondatabase/serverless` with Drizzle PostgreSQL support because the application runs in Cloudflare’s serverless environment.

## Data model

- `alarms`: alarm identity, occurrence time, item, type, process, line, status, reviewer, and review deadline.
- `targets`: management-target identity, name, status, owner, priority, due date, and source alarm reference.
- `action_plans`: action-plan identity, target reference, phenomenon, root cause, and approval status.
- `action_tasks`: task identity, action-plan reference, title, owner, due date, status, and ordering.
- `sample_delay_stages`: alarm reference, fixed stage name, event time, elapsed minutes, allowed minutes, and delayed flag.
- `audit_events`: timestamped create/update/status-change records with entity type and entity id.

## API and application flow

- Add server-side API routes for listing/filtering alarms and targets, retrieving one alarm with its Sample Delay stages, creating/updating targets, and saving action plans/tasks.
- The React page loads persisted alarms/targets through those routes and sends user actions through mutation routes instead of updating only browser state.
- A Sample Delay alarm uses `sample_delay_stages` to display the existing four-stage workflow; other alarm types use the generic detail drawer.
- Seed the development database with the current demonstration records so the completed screens remain usable immediately after connection.

## Safety and validation

- Validate API request bodies and return safe error responses without exposing `DATABASE_URL` or database error details.
- Create Drizzle migrations for every table and run them against `q-target-dev` before enabling live API reads.
- Add database/API tests for persistence and authorization-free development flows; retain current screen regression tests.
- External MES/LIMS integration, user authentication/authorization, and the production database are out of scope for this phase.
