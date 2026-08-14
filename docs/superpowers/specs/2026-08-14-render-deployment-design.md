# Render Deployment Design

## Goal

Deploy Q-Target as a Render Node Web Service without Cloudflare Workers, using the existing Neon database and automatic deployment from the GitHub `main` branch.

## Scope

- Add repository-managed Render configuration only.
- Preserve the current Neon schema and existing application data.
- Keep `DATABASE_URL` out of source control; it will be set as a Render secret by the user.
- Do not change application features, API contracts, or Cloudflare example files that are not used by the Render runtime.

## Deployment architecture

```text
GitHub main branch
      |
      v
Render Web Service
  npm ci
  npx vinext build
  npx vinext start --port $PORT
      |
      v
Existing Neon PostgreSQL database
  DATABASE_URL (Render secret)
```

## Repository configuration

Add `render.yaml` with one Node web service:

- Build command: `npm ci && npx vinext build`
- Start command: `npx vinext start --port $PORT`
- Health check path: `/`
- Auto-deploy from the `main` branch
- Secret placeholder: `DATABASE_URL` with manual synchronization required

The Render dashboard will supply the secret value. The repository will never contain the Neon connection string.

## Validation

1. Validate the Render configuration structure.
2. Run the existing Vinext production build.
3. Run the complete automated test suite.
4. Commit and push only the Render configuration files.

## User handoff

After the configuration is pushed, the user will create a Render Web Service from the GitHub repository, enter the existing Neon `DATABASE_URL` in Render's Environment settings, and trigger the first deploy. No database migration is needed unless the user changes schemas after this deployment setup.
