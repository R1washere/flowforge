# Free Demo Deployment

FlowForge can run as a public portfolio demo using free plans:

- Web: Vercel Hobby
- API: Render Free web service
- Database: Neon Free PostgreSQL

These plans can change. Confirm the provider plan before creating a resource,
keep spending limits enabled where offered, and do not attach a paid add-on.
Render Free services may sleep when idle, so the first API request can be slow.

## Safety Boundary

The hosted app is a shared demo with synthetic data. `PUBLIC_DEMO_MODE=true`
explicitly enables the header-based identity switcher. It is not authentication.
Do not place customer data, personal information, real webhook secrets, or real
integration credentials in this database.

The production seed runs only when the database has no users. Deploys and
restarts do not overwrite an existing non-empty database.

## 1. Database

Create a Neon Free project and copy its pooled PostgreSQL connection string.
The URL must start with `postgresql://` or `postgres://` and should require TLS.
Use it as Render's `DATABASE_URL`. The API start command applies committed
migrations with `prisma migrate deploy` before starting.

## 2. API

Create a Render Blueprint from this repository. `render.yaml` configures a free
Node service. Enter these values when prompted:

- `DATABASE_URL`: the Neon connection string
- `API_CORS_ORIGIN`: the final Vercel origin, for example
  `https://flowforge-demo.vercel.app`

After deploy, verify `https://<render-service>/api/health` returns HTTP 200.

## 3. Web

Import the repository into Vercel on the Hobby plan. Set the project Root
Directory to `apps/web`; `vercel.json` contains the matching monorepo build
settings. Add:

- `NEXT_PUBLIC_API_BASE_URL=https://<render-service>/api`

Deploy, then update Render's `API_CORS_ORIGIN` to the exact production Vercel
origin and redeploy the API if the value changed.

## 4. Live Verification

Do not mark the deployment complete until all checks pass:

1. Open the Vercel URL in a clean browser session.
2. Confirm the dashboard loads data rather than only static layout.
3. Open the workflow builder and execute a demo workflow.
4. Confirm the API health endpoint returns HTTP 200.
5. Confirm a browser request from the Vercel origin succeeds without a CORS
   error.
6. Confirm the latest GitHub Actions run on `main` is green.

## 5. GitHub Visibility

Once live verification passes:

- set the repository **Website** field to the Vercel URL;
- add `Live demo` and `API health` links near the top of the README;
- add topics such as `nextjs`, `nestjs`, `postgresql`, `workflow-automation`,
  and `portfolio-project`;
- keep the CI badge visible.

Never publish a deployment URL before checking it directly.
