# LEARNING-QUICK.md — Device Manager Web

Quick-reference cheat sheet. Code snippets from the actual source files.

---

## 1. Fetch API + async/await

**Central fetch wrapper — `api.js:15`**
```javascript
async function apiFetch(path, options = {}) {
    const headers = { ...getAuthHeader(), 'Content-Type': 'application/json' };
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (response.status === 401) { logout(); return; }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (response.status === 204) return null;
    return response.json();
}
```

Key rules:
- `fetch()` only rejects on network failure — a 404 resolves normally. Always check `response.ok`.
- `204 No Content` (DELETE response) has no body — skip `.json()` or it throws.
- Spread `...options` last so callers can override defaults.

**Calling it:**
```javascript
const devices = await getDevices({ page: 0, size: 20, sort: 'name,asc' });
await deleteDevice(id);   // returns null (204)
```

---

## 2. DOM Manipulation

**Batch innerHTML update — `devices.js:180`**
```javascript
// Build the whole table as one string, assign once (faster than N appendChild calls)
const rows = devices.map(d => `
    <tr>
        <td>${escapeHtml(d.name)}</td>
        <td>${statusBadge(d.status)}</td>
    </tr>`).join('');
container.innerHTML = `<table>...<tbody>${rows}</tbody></table>`;
```

**XSS prevention — `devices.js:522`**
```javascript
function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// Use escapeHtml() for any user-supplied data in innerHTML
// Use .textContent = value for plain text (auto-escaped)
```

---

## 3. State Management

**Single state object — `devices.js:10`**
```javascript
const state = {
    page: 0, size: 20, sort: 'name', direction: 'asc',
    status: '', type: '', q: '',
    totalPages: 0, totalItems: 0,
};
// All UI events mutate state → call loadDevices() → re-render
// Never render directly from event handlers
```

**Debounce pattern — `devices.js:55`**
```javascript
let searchDebounce = null;
input.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
        state.q = e.target.value.trim();
        state.page = 0;
        loadDevices();
    }, 350);  // 350ms quiet period before API call
});
```

**Sort toggle — `devices.js:245`**
```javascript
function sortBy(col) {
    state.direction = (state.sort === col && state.direction === 'asc') ? 'desc' : 'asc';
    state.sort = col;
    state.page = 0;
    loadDevices();
}
```

---

## 4. CSS Layout

**Fixed sidebar + offset main — `app.css:13`**
```css
#sidebar {
    position: fixed;       /* out of flow, overlays everything */
    width: 240px;
    height: 100vh;
    transition: transform 0.3s ease;   /* enables slide animation */
}
#main-content {
    margin-left: 240px;    /* compensate for fixed sidebar width */
}
```

**Mobile collapse — `app.css:327`**
```css
@media (max-width: 768px) {
    #sidebar          { transform: translateX(-100%); }  /* hidden off-screen */
    #sidebar.show     { transform: translateX(0); }      /* JS toggles .show */
    #main-content     { margin-left: 0; }
}
/* Why transform, not display:none? — display:none can't animate */
```

**480px extra-small stack — `app.css:407`**
```css
@media (max-width: 480px) {
    .toolbar { flex-direction: column; align-items: stretch; }
}
```

---

## 5. Bootstrap 5

**Responsive grid columns:**
```html
<div class="col-sm-6 col-xl-3">
<!-- sm (≥576px): 6/12 = 2 per row | xl (≥1200px): 3/12 = 4 per row -->
```

**Programmatic modal — `devices.js:44`**
```javascript
const deviceModal = new bootstrap.Modal(document.getElementById('device-modal'));
deviceModal.show();
deviceModal.hide();
// Use programmatic API when you need to do async work (e.g. fetch device) before showing
```

**Scrollable modal body:**
```html
<div class="modal-dialog modal-dialog-scrollable">
<!-- modal body scrolls independently; header+footer stay fixed -->
```

**Bootstrap 5 form validation:**
```javascript
form.classList.add('was-validated');  // triggers CSS :valid/:invalid styles
if (!form.checkValidity()) return;    // browser validates required/pattern/minlength
```

**Loading spinner in button:**
```html
<button id="save-btn">
    <span id="save-text">Save</span>
    <span id="save-spinner" class="spinner-border spinner-border-sm d-none"></span>
</button>
```
```javascript
saveBtn.disabled = true;
saveSpinner.classList.remove('d-none');
try { await save(); } finally { saveBtn.disabled = false; saveSpinner.classList.add('d-none'); }
```

---

## 6. Chart.js

**Create once, update on refresh — `dashboard.js:81`**
```javascript
let typeChart = null;   // module-level — survives re-renders

function renderTypeChart(byType) {
    const ctx = document.getElementById('chart-type').getContext('2d');

    if (typeChart) {
        typeChart.data.labels            = labels;
        typeChart.data.datasets[0].data  = data;
        typeChart.update();   // animate from old to new values
        return;               // don't recreate — "Canvas already in use" error
    }

    typeChart = new Chart(ctx, { type: 'doughnut', data: { labels, datasets: [{ data }] },
        options: { responsive: true, maintainAspectRatio: false } });
}
```

**Horizontal bar chart:**
```javascript
{ type: 'bar', options: { indexAxis: 'y' } }
// indexAxis: 'y' flips the bar chart 90° → horizontal bars
```

---

## 7. Browser Auth

**Basic Auth token creation — `auth.js:16`**
```javascript
const token = btoa(`${username}:${password}`);  // base64 encode
// Sent as: Authorization: Basic YWRtaW46YWRtaW4xMjM=
```

**Store in sessionStorage (clears on tab close):**
```javascript
sessionStorage.setItem('dmw_auth', token);  // vs localStorage (survives restarts)
sessionStorage.getItem('dmw_auth');
sessionStorage.removeItem('dmw_auth');
```

**Auth guard for protected pages — `auth.js:45`**
```javascript
function requireAuth() {
    if (!sessionStorage.getItem(AUTH_KEY)) {
        window.location.href = 'index.html';  // redirect to login
    }
}
// Call at DOMContentLoaded on every protected page
document.addEventListener('DOMContentLoaded', () => { requireAuth(); /* ... */ });
```

**Inject header on every request — `api.js:16`**
```javascript
const headers = { ...getAuthHeader(), 'Content-Type': 'application/json' };
// getAuthHeader() returns { Authorization: `Basic ${token}` }
```
