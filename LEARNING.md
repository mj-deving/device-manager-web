# LEARNING.md — Device Manager Web (Project 3)

This document explains the core web development patterns demonstrated in this project.
It is written for a reader who understands programming but is newer to browser-native JavaScript
(or anyone who wants to understand what frameworks like React or Vue are abstracting away).

---

## 1. Fetch API + async/await

### What is Fetch?

`fetch()` is the browser's built-in HTTP client. It replaced `XMLHttpRequest` and returns a `Promise`
— a value that will be resolved in the future. You can either chain `.then()` on it, or use
`async/await` which makes it read like synchronous code.

### Our pattern: a single fetch wrapper

Rather than calling `fetch()` directly everywhere, all HTTP calls go through one function in `api.js`:

```javascript
// api.js:15-39
async function apiFetch(path, options = {}) {
    const headers = {
        ...getAuthHeader(),           // inject auth on every call
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),   // caller can override
    };

    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (response.status === 401) {
        logout();   // token expired — force re-login
        return;
    }

    if (!response.ok) {
        let msg = `HTTP ${response.status}`;
        try {
            const body = await response.json();
            msg = body.message ?? body.error ?? msg;
        } catch (_) { /* ignore parse errors */ }
        throw new Error(msg);
    }

    if (response.status === 204) return null;  // DELETE returns no body
    return response.json();
}
```

**Why centralise?** Every API call needs the same auth header, the same error handling, and the
same 401 → logout redirect. If this logic lived in each call site, a bug in the error handler
would need fixing in 8 places. One wrapper = one place to fix.

**Why `response.ok` before `.json()`?** `fetch()` only rejects on network errors (DNS failure,
no internet). A server returning HTTP 404 or 500 is considered a successful network request — the
Promise resolves normally. You must check `response.ok` (true for 2xx) yourself before trusting
the body.

**async/await vs .then chains:**
```javascript
// Promise chain — still valid, but harder to read with error handling
fetch(url)
  .then(r => r.json())
  .then(data => render(data))
  .catch(err => showToast(err.message, 'danger'));

// async/await — same code, reads top-to-bottom like synchronous code
async function load() {
    try {
        const data = await fetch(url).then(r => r.json());
        render(data);
    } catch (err) {
        showToast(err.message, 'danger');
    }
}
```

---

## 2. DOM Manipulation

### Building HTML in JavaScript

The DOM (Document Object Model) is the browser's live representation of your HTML page.
JavaScript can read and modify it at any time. There are two main approaches:

**Option A — Individual element creation** (verbose, safe):
```javascript
const tr = document.createElement('tr');
const td = document.createElement('td');
td.textContent = device.name;  // safe — no HTML injection possible
tr.appendChild(td);
tbody.appendChild(tr);
```

**Option B — Template literals + innerHTML** (concise, fast, requires escaping):
```javascript
// devices.js:180-208
const rows = devices.map(d => `
    <tr>
        <td class="fw-semibold">${escapeHtml(d.name)}</td>
        <td>${statusBadge(d.status)}</td>
        ...
    </tr>`).join('');

container.innerHTML = `<table>...<tbody>${rows}</tbody></table>`;
```

We use Option B because building a 50-row table string and assigning it once is faster than
making 50+ `appendChild` calls (each one can trigger a browser layout reflow). The tradeoff:
you must escape any user data you insert.

### Why escapeHtml() matters (XSS prevention)

```javascript
// devices.js:522-530
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
```

If a device in the database has the name `<script>alert('hacked')</script>`, inserting it
directly into `innerHTML` would execute that script in every user's browser — a Cross-Site
Scripting (XSS) attack. `escapeHtml()` converts `<` to `&lt;` so the browser displays it as
text instead of parsing it as HTML. **Rule of thumb**: use `textContent` for plain text,
`escapeHtml()` when building HTML strings from untrusted data.

---

## 3. State Management (without a framework)

### The `state` object pattern

React and Vue manage their own internal state objects and re-render whenever state changes.
Without a framework, we do this manually. In `devices.js`:

```javascript
// devices.js:10-20
const state = {
    page:       0,
    size:       20,
    sort:       'name',
    direction:  'asc',
    status:     '',
    type:       '',
    q:          '',
    totalPages: 0,
    totalItems: 0,
};
```

Every UI interaction mutates this object and then calls `loadDevices()`. That one function
reads `state`, fetches from the API, and re-renders the entire table. This "single source of
truth → render" pattern is exactly what React does with `setState` — just without the reactivity system.

```javascript
// User clicks a column header → mutates state → re-renders
function sortBy(col) {
    if (state.sort === col) {
        state.direction = state.direction === 'asc' ? 'desc' : 'asc';
    } else {
        state.sort      = col;
        state.direction = 'asc';
    }
    state.page = 0;      // always reset to page 0 on sort
    loadDevices();       // the only render trigger
}
```

### Debouncing search input

Calling `loadDevices()` on every keystroke would fire an API request for each character typed.
With a 10-character query, that's 10 requests — most of them immediately cancelled by the next.

```javascript
// devices.js:55-62
document.getElementById('search-input').addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
        state.q    = e.target.value.trim();
        state.page = 0;
        loadDevices();
    }, 350);  // wait 350ms after the last keystroke before fetching
});
```

`setTimeout` returns a handle. `clearTimeout` cancels a pending timer. Each keystroke cancels
the previous timer and starts a new 350ms window. Only the final keystroke after the user
pauses actually triggers the API call. This pattern is called "debouncing".

---

## 4. CSS Layout: Fixed Sidebar + Scrollable Main

### The layout strategy

```
┌────────────┬──────────────────────────────────┐
│            │                                   │
│  sidebar   │      main content                 │
│  (fixed)   │      (scrolls independently)      │
│            │                                   │
└────────────┴──────────────────────────────────┘
```

Achieved with two CSS rules:

```css
/* app.css:13-26 */
#sidebar {
    position: fixed;   /* removed from normal flow, stays while page scrolls */
    top: 0;
    left: 0;
    width: 240px;
    height: 100vh;     /* full viewport height */
    /* ... */
}

/* app.css:97-100 */
#main-content {
    margin-left: 240px;  /* push content right so sidebar doesn't overlap it */
    min-height: 100vh;
}
```

`position: fixed` takes the sidebar out of the normal document flow — it no longer affects
the layout of other elements. The `margin-left: 240px` on the main content compensates.

### Mobile: transform vs display:none

```css
/* app.css:327-345 */
@media (max-width: 768px) {
    #sidebar {
        transform: translateX(-100%);  /* slide off-screen to the left */
    }
    #sidebar.show {
        transform: translateX(0);      /* slide back in */
    }
    #main-content {
        margin-left: 0;   /* no sidebar offset on mobile */
    }
}
```

Why `transform: translateX(-100%)` instead of `display: none`?

- `display: none` removes the element entirely — no transition is possible (you can't animate
  from "doesn't exist" to "exists")
- `transform` moves the element visually but keeps it in memory — the `transition: transform 0.3s ease`
  on `#sidebar` then creates a smooth slide animation when the `.show` class is toggled

---

## 5. Bootstrap 5 Integration

### Responsive grid

Bootstrap's grid divides the page into 12 columns. `col-sm-6 col-xl-3` means:
- on small screens (≥576px): take 6 of 12 columns (2 cards per row)
- on extra-large screens (≥1200px): take 3 of 12 columns (4 cards per row)

```html
<!-- dashboard.html stat cards -->
<div class="row g-3 mb-4">
    <div class="col-sm-6 col-xl-3">  <!-- 4 cards, responsive -->
        <div class="stat-card">...</div>
    </div>
    ...
</div>
```

### Programmatic modal control

Bootstrap provides two ways to control modals:

```html
<!-- Declarative — Bootstrap handles show/hide automatically -->
<button data-bs-toggle="modal" data-bs-target="#device-modal">Add</button>
```

```javascript
// Programmatic — we control when and how the modal appears
// devices.js:44-46
deviceModal = new bootstrap.Modal(document.getElementById('device-modal'));

// Later, when ready to show (after pre-filling form data from API):
deviceModal.show();
deviceModal.hide();
```

We use the programmatic API because the edit modal needs to fetch device data from the API
before showing — a declarative `data-bs-toggle` would show the empty modal instantly.

### `modal-dialog-scrollable`

```html
<div class="modal-dialog modal-dialog-scrollable">
```

This Bootstrap class makes the modal body independently scrollable. Without it, a device with
many audit log entries would push the modal taller than the viewport, and the entire page would
scroll — which looks broken. With it, only the modal body scrolls while the header and footer
stay fixed.

---

## 6. Chart.js

### Creating vs updating a chart

Chart.js charts are stateful objects. Creating a new chart on a `<canvas>` that already has
one causes an error ("Canvas is already in use"). The solution: keep the instance in a variable.

```javascript
// dashboard.js:6-7
let typeChart   = null;
let statusChart = null;

// dashboard.js:81-107
function renderTypeChart(byType) {
    // ...
    if (typeChart) {
        // Chart already exists — update data in place
        typeChart.data.labels              = labels;
        typeChart.data.datasets[0].data    = data;
        typeChart.update();   // triggers re-render with animation
        return;
    }

    // First render — create the chart
    typeChart = new Chart(ctx, { type: 'doughnut', data: { ... }, options: { ... } });
}
```

`chart.update()` is more efficient than recreating because it reuses the canvas context and
animates the transition from old values to new ones — which looks better on the 30s auto-refresh.

### Doughnut vs horizontal bar

The type distribution uses a **doughnut** (good for "what proportion is each category").
The status distribution uses a **horizontal bar** with `indexAxis: 'y'` (good for comparing
discrete counts, especially when labels are long words like "Decommissioned").

```javascript
// dashboard.js:135
options: {
    indexAxis: 'y',   // this one config key flips a bar chart horizontal
    ...
}
```

---

## 7. Authentication in the Browser

### Basic Auth: what it is

HTTP Basic Authentication sends credentials in a header on every request:

```
Authorization: Basic YWRtaW46YWRtaW4xMjM=
```

The value after "Basic " is `base64(username + ":" + password)`. In JavaScript:

```javascript
// auth.js:16
const token = btoa(`${username}:${password}`);
// btoa() = "binary to ASCII" = base64 encode
```

`btoa` is a built-in browser function. The resulting string is stored and attached to every
request via `getAuthHeader()`.

### Why sessionStorage, not localStorage?

```javascript
// auth.js:27-28
sessionStorage.setItem(AUTH_KEY, token);
sessionStorage.setItem(USER_KEY, username);
```

| Storage | Lifetime | Scope |
|---------|----------|-------|
| `localStorage` | Permanent (until cleared) | All tabs on this origin |
| `sessionStorage` | Until tab is closed | This tab only |
| Cookie (session) | Until browser closed (or explicit expiry) | Controlled by server |

We use `sessionStorage` because these are admin credentials. Closing the tab should require
logging in again — you wouldn't want to leave an admin dashboard logged in on a shared computer.
`localStorage` would persist across browser restarts.

### Why no server-side session?

This app is entirely stateless: every request includes the full credentials. The server
(Spring Boot with Basic Auth) doesn't store any session state — it validates the header on every
request independently.

This is simpler to implement (no session management, no token expiry logic) but has trade-offs:
- Credentials travel in every request header (fine over HTTPS, less ideal over HTTP)
- No way to "invalidate" a session server-side (you can't log someone else out)
- `logout()` just clears the browser storage — the credentials themselves are still valid

For a production app handling sensitive data, you'd replace this with OAuth2 or JWTs with
short expiry times and refresh token rotation.

---

## Summary

| Concept | Where to see it |
|---------|----------------|
| Fetch wrapper with auth injection | `js/api.js:15` — `apiFetch()` |
| XSS-safe innerHTML | `js/devices.js:180` — `renderTable()` + `escapeHtml()` |
| Single-state + single render function | `js/devices.js:10` — `state` + `loadDevices()` |
| Debounced search | `js/devices.js:55` — search input listener |
| Fixed sidebar layout | `css/app.css:13` — `#sidebar`, `#main-content` |
| CSS transform for sidebar animation | `css/app.css:327` — `@media (max-width: 768px)` |
| Programmatic Bootstrap modal | `js/devices.js:44` — `new bootstrap.Modal(...)` |
| Chart update vs recreate | `js/dashboard.js:81` — `renderTypeChart()` |
| sessionStorage for auth | `js/auth.js:27` — `login()` |
