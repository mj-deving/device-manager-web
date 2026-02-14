/**
 * utils.js — Shared formatting helpers and domain constants.
 */

/**
 * Format an ISO 8601 date string into a human-readable form.
 * @param {string} isoStr
 * @returns {string} e.g. "14 Feb 2026, 10:30"
 */
function formatDate(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

/**
 * Return a Bootstrap badge HTML string for a device status.
 * @param {string} status
 * @returns {string} HTML string
 */
function statusBadge(status) {
    const map = {
        ACTIVE:          '<span class="badge bg-success">Active</span>',
        INACTIVE:        '<span class="badge bg-secondary">Inactive</span>',
        MAINTENANCE:     '<span class="badge bg-warning text-dark">Maintenance</span>',
        DECOMMISSIONED:  '<span class="badge bg-danger">Decommissioned</span>',
    };
    return map[status] ?? `<span class="badge bg-light text-dark">${status}</span>`;
}

/**
 * Return a Bootstrap Icons class name for a device type.
 * @param {string} type
 * @returns {string}
 */
function typeIcon(type) {
    const map = {
        SERVER:       'bi-server',
        WORKSTATION:  'bi-pc-display',
        LAPTOP:       'bi-laptop',
        PRINTER:      'bi-printer',
        NETWORK:      'bi-router',
        MOBILE:       'bi-phone',
        OTHER:        'bi-cpu',
    };
    return map[type] ?? 'bi-cpu';
}

/**
 * Return a readable label for a device type.
 * @param {string} type
 * @returns {string}
 */
function typeLabel(type) {
    const map = {
        SERVER:       'Server',
        WORKSTATION:  'Workstation',
        LAPTOP:       'Laptop',
        PRINTER:      'Printer',
        NETWORK:      'Network',
        MOBILE:       'Mobile',
        OTHER:        'Other',
    };
    return map[type] ?? type;
}

/** All device statuses (for <select> dropdowns). */
const statusOptions = [
    { value: 'ACTIVE',         label: 'Active' },
    { value: 'INACTIVE',       label: 'Inactive' },
    { value: 'MAINTENANCE',    label: 'Maintenance' },
    { value: 'DECOMMISSIONED', label: 'Decommissioned' },
];

/** All device types (for <select> dropdowns). */
const typeOptions = [
    { value: 'SERVER',      label: 'Server' },
    { value: 'WORKSTATION', label: 'Workstation' },
    { value: 'LAPTOP',      label: 'Laptop' },
    { value: 'PRINTER',     label: 'Printer' },
    { value: 'NETWORK',     label: 'Network' },
    { value: 'MOBILE',      label: 'Mobile' },
    { value: 'OTHER',       label: 'Other' },
];

/**
 * Populate a <select> element with options.
 * @param {HTMLSelectElement} selectEl
 * @param {Array<{value:string, label:string}>} options
 * @param {string} [placeholder] - empty/all option label
 */
function populateSelect(selectEl, options, placeholder = '') {
    selectEl.innerHTML = '';
    if (placeholder) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = placeholder;
        selectEl.appendChild(opt);
    }
    options.forEach(({ value, label }) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        selectEl.appendChild(opt);
    });
}

/**
 * Show a Bootstrap toast-style alert banner.
 * Requires a #toast-container div in the page.
 * @param {string} message
 * @param {'success'|'danger'|'warning'|'info'} type
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const id = `toast-${Date.now()}`;
    container.insertAdjacentHTML('beforeend', `
        <div id="${id}" class="toast align-items-center text-bg-${type} border-0 show" role="alert">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto"
                        data-bs-dismiss="toast"></button>
            </div>
        </div>
    `);
    setTimeout(() => document.getElementById(id)?.remove(), 4000);
}
