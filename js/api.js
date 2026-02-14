/**
 * api.js — Fetch wrapper and typed endpoint functions.
 * All calls go through apiFetch() which handles auth headers and error handling.
 */

const API_BASE = 'http://213.199.32.18/api/v1';

/**
 * Core fetch wrapper.
 * Injects Authorization header, prepends API base, throws on non-2xx.
 * @param {string} path - path starting with /
 * @param {RequestInit} [options]
 * @returns {Promise<any>} parsed JSON body (or null for 204)
 */
async function apiFetch(path, options = {}) {
    const headers = {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
    };

    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (response.status === 401) {
        logout();
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

    if (response.status === 204) return null;
    return response.json();
}

// ---------------------------------------------------------------------------
// Device endpoints
// ---------------------------------------------------------------------------

/**
 * List devices with optional filtering and pagination.
 * @param {{ page?:number, size?:number, sort?:string, direction?:string,
 *            status?:string, type?:string, q?:string }} params
 */
function getDevices(params = {}) {
    const qs = new URLSearchParams();
    if (params.page     != null) qs.set('page',   params.page);
    if (params.size     != null) qs.set('size',   params.size);
    if (params.sort)              qs.set('sort',   `${params.sort},${params.direction ?? 'asc'}`);
    if (params.status)            qs.set('status', params.status);
    if (params.type)              qs.set('type',   params.type);
    if (params.q)                 qs.set('q',      params.q);
    return apiFetch(`/devices?${qs}`);
}

/**
 * Get a single device by UUID.
 * @param {string} id
 */
function getDevice(id) {
    return apiFetch(`/devices/${id}`);
}

/**
 * Create a new device.
 * @param {object} data
 */
function createDevice(data) {
    return apiFetch('/devices', { method: 'POST', body: JSON.stringify(data) });
}

/**
 * Replace a device (full update).
 * @param {string} id
 * @param {object} data
 */
function updateDevice(id, data) {
    return apiFetch(`/devices/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

/**
 * Update a device's status only.
 * @param {string} id
 * @param {string} status
 */
function patchStatus(id, status) {
    return apiFetch(`/devices/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
}

/**
 * Delete a device.
 * @param {string} id
 */
function deleteDevice(id) {
    return apiFetch(`/devices/${id}`, { method: 'DELETE' });
}

/**
 * Get audit logs for a device.
 * @param {string} id
 */
function getDeviceLogs(id) {
    return apiFetch(`/devices/${id}/logs`);
}

// ---------------------------------------------------------------------------
// Stats endpoint
// ---------------------------------------------------------------------------

/**
 * Get aggregated device statistics.
 */
function getStats() {
    return apiFetch('/stats');
}
