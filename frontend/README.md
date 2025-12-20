# Inzighted — Frontend (React + Vite + Tailwind)

A modern React frontend for Inzighted — an AI-driven educational insights platform. This repository contains the single-page application used by educators, students, and admins to authenticate, upload data, and view AI-generated reports and dashboards.

## Quick summary

- Framework: React (Vite)
- Styling: Tailwind CSS
- Package manager: npm
- Purpose: UI for educators and students to interact with the Inzighted platform (upload CSV/PDFs, view reports, dashboards, and insights).

## What you'll find in this repo

Top-level highlights (src/ contains the app source):

- `src/` — application source code
  - `auth/` — auth pages and role-specific login/register screens
  - `dashboards/` — educator and student dashboards, shared components and reports
  - `landing page/` — marketing/landing page components and routes
  - `components/` — UI primitives and reusable pieces (magicui, ui, etc.)
  - `utils/` and `lib/` — API helpers and utility functions
  - `assets/` — images and static assets used by the site
- `public/` — static files served verbatim (favicon, etc.)
- `scripts/` — build helper scripts
- `vite.config.js`, `tailwind.config.js`, `postcss.config.js` — build and styling configs

File naming conventions

- Files prefixed with `e_` are Educator-specific.
- Files prefixed with `s_` are Student-specific.
- Files prefixed with `z_` are shared or role-agnostic.

These conventions help identify role-scoped components quickly.

## Local development (Windows, cmd.exe)

1. Install dependencies

   ```cmd
   npm install
   ```

2. Copy environment example and update values

   ```cmd
   copy .env.example .env.development
   rem Open .env.development and set VITE_API_URL and other values
   ```

   Minimum commonly used env variables

   - `VITE_API_URL` — backend API base URL (e.g. http://localhost:8000/api)
   - Any auth-related VITE_... variables required by your environment (client id, domain, keys).

3. Start the development server

   ```cmd
   npm run dev
   ```

   Visit the app at the port printed by Vite (commonly http://localhost:5173/).

Production build

```cmd
npm run build
npm run preview
```

## Useful npm scripts

(If your `package.json` differs, use the scripts defined there; the commands below are the common Vite defaults.)

- `npm run dev` — start dev server
- `npm run build` — create production build
- `npm run preview` — locally preview the production build

## Project conventions & best practices

- Uses Tailwind utility classes for styling. Prefer Tailwind for new styles.
- Keep components small and focused. Reuse items from `src/components/ui` where possible.
- Use the file-prefix convention (`e_`, `s_`, `z_`) for role-specific code.
- Store short-lived auth tokens in a secure place (the app currently expects JWTs from the backend; confirm storage/refresh policy with the backend team).

## Testing & Quality

- This repo does not include a standardized test harness by default. Add unit tests and/or E2E tests as needed (Jest, React Testing Library, or Playwright/Cypress).
- Run linters or formatters if configured (e.g. ESLint, Prettier). See `eslint.config.js` if present.

## Deployment notes

- Production builds are generated with `npm run build` (Vite).
- Static assets in `public/` are copied to the output directory as-is.
- Ensure `VITE_API_URL` is set to the production backend URL when deploying.

## Contributor guide

1. Fork or branch from the `main` (or `dev`) branch.
2. Install dependencies and run the dev server.
3. Follow the project's file naming conventions and component patterns.
4. Open a pull request with a clear description and screenshots (if UI changes).

## Troubleshooting

- If the dev server fails to start, check for missing environment variables and Node version compatibility (Node 18+ recommended).
- If API calls fail, verify `VITE_API_URL` and CORS configuration on the backend.

## Contact & support

- For repository issues, open an Issue in the main project.
- For developer support, contact techsupport@zai-fi.com.

---

Minimal, focused README to get contributors and developers up-and-running quickly. If you want, I can also:

- Add a short development checklist (lint/build/test) adjusted to the repo's exact scripts.
- Add a CONTRIBUTING.md with PR checklist and branch strategy.
- Generate a smaller `Quick Start` runnable script or PowerShell helper for Windows.