/**
 * devices.js — Device table, sort/filter/search, pagination, CRUD modals.
 * Depends on: auth.js, utils.js, api.js
 */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

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

let deleteTargetId   = null;
let refreshTimer     = null;
let searchDebounce   = null;

// Bootstrap modal instances (created after DOM ready)
let deviceModal, logsModal, deleteModal;

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();

    const userEl = document.getElementById('sidebar-user');
    if (userEl) userEl.textContent = getCurrentUser() ?? '—';

    // Mobile sidebar
    document.getElementById('hamburger')?.addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);

    // Bootstrap modals
    deviceModal = new bootstrap.Modal(document.getElementById('device-modal'));
    logsModal   = new bootstrap.Modal(document.getElementById('logs-modal'));
    deleteModal = new bootstrap.Modal(document.getElementById('delete-modal'));

    // Populate filter dropdowns
    populateSelect(document.getElementById('status-filter'), statusOptions, 'All Statuses');
    populateSelect(document.getElementById('type-filter'),   typeOptions,   'All Types');
    populateSelect(document.getElementById('form-type'),     typeOptions);
    populateSelect(document.getElementById('form-status'),   statusOptions);

    // Toolbar events
    document.getElementById('search-input').addEventListener('input', (e) => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            state.q    = e.target.value.trim();
            state.page = 0;
            loadDevices();
        }, 350);
    });

    document.getElementById('status-filter').addEventListener('change', (e) => {
        state.status = e.target.value;
        state.page   = 0;
        loadDevices();
    });

    document.getElementById('type-filter').addEventListener('change', (e) => {
        state.type = e.target.value;
        state.page = 0;
        loadDevices();
    });

    document.getElementById('clear-filters').addEventListener('click', () => {
        state.q = ''; state.status = ''; state.type = ''; state.page = 0;
        document.getElementById('search-input').value = '';
        document.getElementById('status-filter').value = '';
        document.getElementById('type-filter').value   = '';
        loadDevices();
    });

    // Add device button
    document.getElementById('add-device-btn').addEventListener('click', () => openCreateModal());

    // Save button in modal
    document.getElementById('device-save-btn').addEventListener('click', saveDevice);

    // Delete confirm button
    document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete);

    loadDevices();

    // Auto-refresh every 30s — but NOT while a modal is open
    refreshTimer = setInterval(() => {
        const anyOpen = document.querySelectorAll('.modal.show').length > 0;
        if (!anyOpen) loadDevices();
    }, 30_000);
});

// ---------------------------------------------------------------------------
// Load & render table
// ---------------------------------------------------------------------------

async function loadDevices() {
    try {
        const data = await getDevices({
            page:      state.page,
            size:      state.size,
            sort:      state.sort,
            direction: state.direction,
            status:    state.status,
            type:      state.type,
            q:         state.q,
        });

        state.totalPages = data.totalPages ?? 0;
        state.totalItems = data.totalElements ?? 0;

        const countEl = document.getElementById('device-count');
        if (countEl) {
            countEl.textContent = `${state.totalItems} device${state.totalItems !== 1 ? 's' : ''} found`;
        }

        renderTable(data.content ?? []);
        renderPagination();
    } catch (err) {
        showToast(`Failed to load devices: ${err.message}`, 'danger');
        document.getElementById('table-content').innerHTML = `
            <div class="empty-state">
                <i class="bi bi-exclamation-triangle text-danger"></i>
                Failed to load devices.<br>
                <small class="text-muted">${err.message}</small>
            </div>`;
    }
}

function renderTable(devices) {
    const container = document.getElementById('table-content');

    if (devices.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-inbox"></i>
                No devices found. Try adjusting your filters.
            </div>`;
        return;
    }

    const sortIcon = (col) => {
        if (state.sort !== col) return '<i class="bi bi-chevron-expand sort-icon"></i>';
        return state.direction === 'asc'
            ? '<i class="bi bi-chevron-up sort-icon"></i>'
            : '<i class="bi bi-chevron-down sort-icon"></i>';
    };

    const thClass = (col) => {
        let cls = 'sortable';
        if (state.sort === col) cls += state.direction === 'asc' ? ' sort-asc' : ' sort-desc';
        return cls;
    };

    const rows = devices.map(d => `
        <tr>
            <td class="text-truncate-cell fw-semibold">${escapeHtml(d.name)}</td>
            <td>
                <i class="bi ${typeIcon(d.type)} me-1 text-primary"></i>
                ${typeLabel(d.type)}
            </td>
            <td>${statusBadge(d.status)}</td>
            <td class="text-muted font-monospace">${escapeHtml(d.ipAddress ?? '—')}</td>
            <td class="text-muted text-truncate-cell">${escapeHtml(d.location ?? '—')}</td>
            <td class="text-muted text-nowrap">${formatDate(d.updatedAt ?? d.createdAt)}</td>
            <td class="text-nowrap">
                <button class="btn btn-sm btn-outline-primary action-btn me-1"
                        onclick="openEditModal('${d.id}')"
                        title="Edit">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary action-btn me-1"
                        onclick="openLogsModal('${d.id}', '${escapeHtml(d.name)}')"
                        title="View logs">
                    <i class="bi bi-clock-history"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger action-btn"
                        onclick="openDeleteModal('${d.id}', '${escapeHtml(d.name)}')"
                        title="Delete">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>`).join('');

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-hover table-custom align-middle mb-0">
                <thead>
                    <tr>
                        <th class="${thClass('name')}"    onclick="sortBy('name')">
                            Name ${sortIcon('name')}
                        </th>
                        <th class="${thClass('type')}"    onclick="sortBy('type')">
                            Type ${sortIcon('type')}
                        </th>
                        <th class="${thClass('status')}"  onclick="sortBy('status')">
                            Status ${sortIcon('status')}
                        </th>
                        <th class="${thClass('ipAddress')}" onclick="sortBy('ipAddress')">
                            IP Address ${sortIcon('ipAddress')}
                        </th>
                        <th class="${thClass('location')}" onclick="sortBy('location')">
                            Location ${sortIcon('location')}
                        </th>
                        <th class="${thClass('updatedAt')}" onclick="sortBy('updatedAt')">
                            Updated ${sortIcon('updatedAt')}
                        </th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

function sortBy(col) {
    if (state.sort === col) {
        state.direction = state.direction === 'asc' ? 'desc' : 'asc';
    } else {
        state.sort      = col;
        state.direction = 'asc';
    }
    state.page = 0;
    loadDevices();
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function renderPagination() {
    const nav = document.getElementById('pagination-nav');
    const ul  = document.getElementById('pagination');

    if (state.totalPages <= 1) {
        nav.classList.add('d-none');
        return;
    }

    nav.classList.remove('d-none');
    const pages = [];

    // Prev
    pages.push(`
        <li class="page-item ${state.page === 0 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${state.page - 1}); return false;">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>`);

    // Page numbers (show at most 7: first, last, current ±2, with ellipsis)
    const range = buildPageRange(state.page, state.totalPages);
    range.forEach(p => {
        if (p === '…') {
            pages.push(`<li class="page-item disabled"><span class="page-link">…</span></li>`);
        } else {
            pages.push(`
                <li class="page-item ${p === state.page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="goToPage(${p}); return false;">${p + 1}</a>
                </li>`);
        }
    });

    // Next
    pages.push(`
        <li class="page-item ${state.page >= state.totalPages - 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${state.page + 1}); return false;">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>`);

    ul.innerHTML = pages.join('');
}

function buildPageRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);
    const range = new Set([0, total - 1, current]);
    for (let i = Math.max(1, current - 2); i <= Math.min(total - 2, current + 2); i++) {
        range.add(i);
    }
    const sorted = [...range].sort((a, b) => a - b);
    const result = [];
    sorted.forEach((p, i) => {
        if (i > 0 && p - sorted[i - 1] > 1) result.push('…');
        result.push(p);
    });
    return result;
}

function goToPage(p) {
    if (p < 0 || p >= state.totalPages) return;
    state.page = p;
    loadDevices();
    window.scrollTo(0, 0);
}

// ---------------------------------------------------------------------------
// Create / Edit modal
// ---------------------------------------------------------------------------

function openCreateModal() {
    document.getElementById('device-modal-title').textContent = 'Add Device';
    document.getElementById('device-form').reset();
    document.getElementById('device-form').classList.remove('was-validated');
    document.getElementById('form-id').value = '';
    // Default to ACTIVE and SERVER
    document.getElementById('form-status').value = 'ACTIVE';
    document.getElementById('form-type').value   = 'SERVER';
    deviceModal.show();
}

async function openEditModal(id) {
    document.getElementById('device-modal-title').textContent = 'Edit Device';
    document.getElementById('device-form').reset();
    document.getElementById('device-form').classList.remove('was-validated');

    try {
        const d = await getDevice(id);
        document.getElementById('form-id').value          = d.id;
        document.getElementById('form-name').value        = d.name ?? '';
        document.getElementById('form-type').value        = d.type ?? '';
        document.getElementById('form-status').value      = d.status ?? '';
        document.getElementById('form-ip').value          = d.ipAddress ?? '';
        document.getElementById('form-location').value    = d.location ?? '';
        document.getElementById('form-serial').value      = d.serialNumber ?? '';
        document.getElementById('form-description').value = d.description ?? '';
        deviceModal.show();
    } catch (err) {
        showToast(`Could not load device: ${err.message}`, 'danger');
    }
}

async function saveDevice() {
    const form = document.getElementById('device-form');
    form.classList.add('was-validated');
    if (!form.checkValidity()) return;

    const id = document.getElementById('form-id').value;
    const data = {
        name:         document.getElementById('form-name').value.trim(),
        type:         document.getElementById('form-type').value,
        status:       document.getElementById('form-status').value,
        ipAddress:    document.getElementById('form-ip').value.trim() || null,
        location:     document.getElementById('form-location').value.trim() || null,
        serialNumber: document.getElementById('form-serial').value.trim() || null,
        description:  document.getElementById('form-description').value.trim() || null,
    };

    const saveBtn     = document.getElementById('device-save-btn');
    const saveText    = document.getElementById('save-text');
    const saveSpinner = document.getElementById('save-spinner');

    saveBtn.disabled = true;
    saveText.textContent = 'Saving…';
    saveSpinner.classList.remove('d-none');

    try {
        if (id) {
            await updateDevice(id, data);
            showToast('Device updated successfully.', 'success');
        } else {
            await createDevice(data);
            showToast('Device created successfully.', 'success');
        }
        deviceModal.hide();
        loadDevices();
    } catch (err) {
        showToast(`Save failed: ${err.message}`, 'danger');
    } finally {
        saveBtn.disabled = false;
        saveText.textContent = 'Save';
        saveSpinner.classList.add('d-none');
    }
}

// ---------------------------------------------------------------------------
// Logs modal
// ---------------------------------------------------------------------------

async function openLogsModal(id, name) {
    document.getElementById('logs-device-name').textContent = name;
    document.getElementById('logs-content').innerHTML = `
        <div class="loading-spinner">
            <div class="spinner-border spinner-border-sm me-2"></div> Loading logs…
        </div>`;
    logsModal.show();

    try {
        const logs = await getDeviceLogs(id);
        renderLogs(logs);
    } catch (err) {
        document.getElementById('logs-content').innerHTML = `
            <div class="empty-state text-danger">
                <i class="bi bi-exclamation-triangle"></i>
                Failed to load logs: ${err.message}
            </div>`;
    }
}

function renderLogs(logs) {
    const container = document.getElementById('logs-content');

    if (!logs || logs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-clock-history"></i>
                No log entries found for this device.
            </div>`;
        return;
    }

    const rows = logs.map(l => `
        <tr>
            <td><span class="badge bg-light text-dark border">${escapeHtml(l.action ?? '—')}</span></td>
            <td>${escapeHtml(l.description ?? '—')}</td>
            <td class="text-muted text-nowrap">${formatDate(l.createdAt)}</td>
        </tr>`).join('');

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-sm table-hover">
                <thead>
                    <tr>
                        <th>Action</th>
                        <th>Description</th>
                        <th>When</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

// ---------------------------------------------------------------------------
// Delete modal
// ---------------------------------------------------------------------------

function openDeleteModal(id, name) {
    deleteTargetId = id;
    document.getElementById('delete-device-name').textContent = name;
    deleteModal.show();
}

async function confirmDelete() {
    if (!deleteTargetId) return;

    const btn     = document.getElementById('confirm-delete-btn');
    const text    = document.getElementById('delete-text');
    const spinner = document.getElementById('delete-spinner');

    btn.disabled = true;
    text.textContent = 'Deleting…';
    spinner.classList.remove('d-none');

    try {
        await deleteDevice(deleteTargetId);
        showToast('Device deleted.', 'success');
        deleteModal.hide();
        deleteTargetId = null;
        loadDevices();
    } catch (err) {
        showToast(`Delete failed: ${err.message}`, 'danger');
    } finally {
        btn.disabled = false;
        text.textContent = 'Delete';
        spinner.classList.add('d-none');
    }
}

// ---------------------------------------------------------------------------
// Sidebar helpers (mobile)
// ---------------------------------------------------------------------------

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('show');
    document.getElementById('sidebar-overlay').classList.toggle('show');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('show');
    document.getElementById('sidebar-overlay').classList.remove('show');
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Escape HTML entities to prevent XSS when inserting user data into innerHTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
