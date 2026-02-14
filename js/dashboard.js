/**
 * dashboard.js — Stats cards, Chart.js charts, recent activity table.
 * Depends on: auth.js, utils.js, api.js (loaded before this in dashboard.html)
 */

let typeChart   = null;
let statusChart = null;
let refreshTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();

    // Show logged-in username in sidebar
    const userEl = document.getElementById('sidebar-user');
    if (userEl) userEl.textContent = getCurrentUser() ?? '—';

    // Mobile sidebar toggle
    document.getElementById('hamburger')?.addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);

    // Manual refresh button
    document.getElementById('refresh-btn')?.addEventListener('click', loadDashboard);

    loadDashboard();
    refreshTimer = setInterval(loadDashboard, 30_000);
});

/**
 * Main load: fetch stats and render everything.
 */
async function loadDashboard() {
    try {
        const stats = await getStats();
        renderStatCards(stats);
        renderCharts(stats);
        renderActivity(stats);
        document.getElementById('last-refreshed').textContent =
            `Last refreshed: ${formatDate(new Date().toISOString())}`;
    } catch (err) {
        showToast(`Failed to load dashboard: ${err.message}`, 'danger');
    }
}

// ---------------------------------------------------------------------------
// Stat cards
// ---------------------------------------------------------------------------

function renderStatCards(stats) {
    const byStatus = stats.byStatus ?? {};
    setText('stat-total',          stats.total ?? 0);
    setText('stat-active',         byStatus.ACTIVE ?? 0);
    setText('stat-maintenance',    byStatus.MAINTENANCE ?? 0);
    setText('stat-decommissioned', byStatus.DECOMMISSIONED ?? 0);
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

function renderCharts(stats) {
    renderTypeChart(stats.byType ?? {});
    renderStatusChart(stats.byStatus ?? {});
}

function renderTypeChart(byType) {
    const labels = Object.keys(byType).map(typeLabel);
    const data   = Object.values(byType);
    const colors = [
        '#4e9af1', '#22c55e', '#f59e0b', '#ef4444',
        '#8b5cf6', '#06b6d4', '#f97316',
    ];

    const ctx = document.getElementById('chart-type').getContext('2d');

    if (typeChart) {
        typeChart.data.labels     = labels;
        typeChart.data.datasets[0].data = data;
        typeChart.update();
        return;
    }

    typeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors.slice(0, data.length),
                borderWidth: 2,
                borderColor: '#fff',
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' },
            },
        },
    });
}

function renderStatusChart(byStatus) {
    const order  = ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DECOMMISSIONED'];
    const labels = order.map(s => s.charAt(0) + s.slice(1).toLowerCase());
    const data   = order.map(s => byStatus[s] ?? 0);
    const colors = ['#22c55e', '#9ba3af', '#f59e0b', '#ef4444'];

    const ctx = document.getElementById('chart-status').getContext('2d');

    if (statusChart) {
        statusChart.data.datasets[0].data = data;
        statusChart.update();
        return;
    }

    statusChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Devices',
                data,
                backgroundColor: colors,
                borderRadius: 6,
            }],
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    grid: { color: 'rgba(0,0,0,0.05)' },
                },
                y: { grid: { display: false } },
            },
        },
    });
}

// ---------------------------------------------------------------------------
// Recent activity table
// ---------------------------------------------------------------------------

function renderActivity(stats) {
    const container = document.getElementById('activity-content');
    const activity  = stats.recentActivity ?? [];

    if (activity.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-clock-history"></i>
                No recent activity found.
            </div>`;
        return;
    }

    const rows = activity.map(entry => `
        <tr>
            <td>
                <span class="badge bg-light text-dark border">${entry.action ?? '—'}</span>
            </td>
            <td>${entry.deviceName ?? '—'}</td>
            <td class="text-muted" style="max-width:320px;">${entry.description ?? '—'}</td>
            <td class="text-muted text-nowrap">${formatDate(entry.createdAt)}</td>
        </tr>`).join('');

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-sm table-hover mb-0">
                <thead>
                    <tr>
                        <th>Action</th>
                        <th>Device</th>
                        <th>Description</th>
                        <th>When</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
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
