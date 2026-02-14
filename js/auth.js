/**
 * auth.js — Login state management
 * Stores Basic Auth token in sessionStorage (clears on tab close).
 */

const AUTH_KEY = 'dmw_auth';
const USER_KEY = 'dmw_user';

/**
 * Attempt login: encode credentials, store in sessionStorage, redirect to dashboard.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<void>} resolves on success, rejects with Error on 401/network failure
 */
async function login(username, password) {
    const token = btoa(`${username}:${password}`);

    // Validate against the live API before accepting credentials
    const response = await fetch('http://213.199.32.18/api/v1/devices?page=0&size=1', {
        headers: { 'Authorization': `Basic ${token}` }
    });

    if (!response.ok) {
        throw new Error(response.status === 401 ? 'Invalid username or password.' : `Server error: ${response.status}`);
    }

    sessionStorage.setItem(AUTH_KEY, token);
    sessionStorage.setItem(USER_KEY, username);
    window.location.href = 'dashboard.html';
}

/**
 * Clear session and return to login page.
 */
function logout() {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(USER_KEY);
    window.location.href = 'index.html';
}

/**
 * Guard for protected pages — call at DOMContentLoaded.
 * Redirects to index.html if no token is stored.
 */
function requireAuth() {
    if (!sessionStorage.getItem(AUTH_KEY)) {
        window.location.href = 'index.html';
    }
}

/**
 * Returns the Authorization header object for use in fetch() calls.
 * @returns {{ Authorization: string }}
 */
function getAuthHeader() {
    const token = sessionStorage.getItem(AUTH_KEY);
    return { 'Authorization': `Basic ${token}` };
}

/**
 * Returns the stored username, or null if not logged in.
 * @returns {string|null}
 */
function getCurrentUser() {
    return sessionStorage.getItem(USER_KEY);
}
