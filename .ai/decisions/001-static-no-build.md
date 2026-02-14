# ADR 001: Static HTML/CSS/JS — No Bundler, No Framework

**Date**: 2026-02-14
**Status**: Accepted

---

## Context

Project 3 is a web frontend for the Device Manager REST API. It needs to:
- Display a device list with CRUD operations
- Show a stats dashboard with charts
- Authenticate users against a Basic Auth API
- Be deployed as static files to nginx (`/var/www/portfolio/`)

The frontend could be built with any of:
- A modern framework (React, Vue, Svelte)
- A bundler + transpiler (Vite, webpack)
- Plain HTML/CSS/JavaScript with CDN libraries

## Decision

Use **plain HTML/CSS/JavaScript** with Bootstrap 5 and Chart.js loaded from CDN.
No npm, no bundler, no framework, no build step.

## Reasons

1. **Demonstrates vanilla JS mastery**: Portfolio audiences (hiring managers, developers) can read
   the code directly without knowing any framework idioms. Shows understanding of the DOM,
   Fetch API, event handling, and module organisation — fundamentals that any framework builds on.

2. **Zero-dependency deployment**: Deployment is `scp -r * dev@vps:/var/www/portfolio/` — done.
   No `npm install`, no `npm run build`, no CI build job that runs for 3 minutes, no `node_modules`
   in the repository. The server just serves files.

3. **Appropriate scale**: A portfolio app with ~5 concurrent users and ~200 devices does not need
   React's virtual DOM diffing, Vue's reactivity system, or webpack's tree-shaking. Those tools
   exist to solve problems at scale; applying them here would be premature optimisation.

4. **CDN serves libraries**: Bootstrap 5 (~30KB gzip) and Chart.js (~60KB gzip) from jsDelivr
   CDN have global edge caching — faster than self-hosting them from a single VPS.

## Trade-offs

| Factor | Static + CDN | React/Vite |
|--------|-------------|------------|
| Deployment | `scp` + done | `npm run build` + CI + artifact |
| Code readability | Anyone with JS knowledge | Requires framework knowledge |
| Sidebar duplication | Duplicated HTML in each page | Component reuse |
| Bundle size | ~90KB CDN | ~150-400KB (with tree-shaking) |
| Type safety | None | TypeScript possible |
| State management | Manual DOM manipulation | React state / Vue reactive |
| Future scalability | Refactor to framework needed | Already there |

## Consequences

- The sidebar navigation HTML is duplicated in `dashboard.html` and `devices.html` —
  acceptable at 2 pages.
- If the project grows beyond ~5 pages, extracting shared HTML via a JS `renderShared()`
  function or Web Components would be the pragmatic next step before introducing a framework.
- No type safety — XSS protection handled manually via `escapeHtml()` in `devices.js`.
