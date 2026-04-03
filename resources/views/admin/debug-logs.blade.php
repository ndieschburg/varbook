<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Debug Logs - {{ config('app.name') }}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .log-line { font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 12px; }
        .log-LOG { color: #9ca3af; }
        .log-WARN { color: #fbbf24; }
        .log-ERROR { color: #ef4444; }
    </style>
</head>
<body class="bg-gray-900 text-gray-100 min-h-screen p-4">
    <div class="max-w-7xl mx-auto">
        <div class="flex justify-between items-center mb-4">
            <h1 class="text-2xl font-bold">Debug Logs</h1>
            <div class="flex gap-2">
                <span id="status" class="px-3 py-1 rounded text-sm bg-green-600">Live</span>
                <button onclick="togglePause()" id="pauseBtn" class="px-3 py-1 rounded text-sm bg-blue-600 hover:bg-blue-700">Pause</button>
                <button onclick="clearLogs()" class="px-3 py-1 rounded text-sm bg-red-600 hover:bg-red-700">Clear</button>
                <button onclick="copyLogs()" class="px-3 py-1 rounded text-sm bg-purple-600 hover:bg-purple-700">Copy All</button>
                <a href="/library" class="px-3 py-1 rounded text-sm bg-gray-600 hover:bg-gray-700">Back to App</a>
            </div>
        </div>

        <div class="mb-4 flex gap-4 items-center">
            <input type="text" id="filter" placeholder="Filter logs..."
                   class="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white w-64"
                   oninput="applyFilter()">
            <label class="flex items-center gap-2">
                <input type="checkbox" id="autoScroll" checked class="rounded">
                <span class="text-sm">Auto-scroll</span>
            </label>
            <span id="logCount" class="text-sm text-gray-400">0 logs</span>
        </div>

        <div id="logs" class="bg-gray-800 rounded-lg p-4 h-[calc(100vh-180px)] overflow-y-auto font-mono text-sm">
            <div class="text-gray-500">Waiting for logs...</div>
        </div>
    </div>

    <script>
        const logsContainer = document.getElementById('logs');
        const filterInput = document.getElementById('filter');
        const logCountEl = document.getElementById('logCount');
        const statusEl = document.getElementById('status');
        const pauseBtn = document.getElementById('pauseBtn');
        const autoScrollCheckbox = document.getElementById('autoScroll');

        let allLogs = [];
        let isPaused = false;
        let lastCount = 0;

        async function fetchLogs() {
            if (isPaused) return;

            try {
                const response = await fetch('/api/debug/logs', {
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                    },
                    credentials: 'include'
                });

                if (!response.ok) throw new Error('Failed to fetch');

                const data = await response.json();

                if (data.logs.length !== lastCount) {
                    allLogs = data.logs;
                    lastCount = data.logs.length;
                    renderLogs();
                }

                statusEl.textContent = 'Live';
                statusEl.className = 'px-3 py-1 rounded text-sm bg-green-600';
            } catch (error) {
                statusEl.textContent = 'Error';
                statusEl.className = 'px-3 py-1 rounded text-sm bg-red-600';
            }
        }

        function renderLogs() {
            const filter = filterInput.value.toLowerCase();
            const filteredLogs = filter
                ? allLogs.filter(log => log.toLowerCase().includes(filter))
                : allLogs;

            if (filteredLogs.length === 0) {
                logsContainer.innerHTML = '<div class="text-gray-500">No logs yet...</div>';
            } else {
                logsContainer.innerHTML = filteredLogs.map(log => {
                    let levelClass = 'log-LOG';
                    if (log.includes('[WARN]')) levelClass = 'log-WARN';
                    if (log.includes('[ERROR]')) levelClass = 'log-ERROR';
                    return `<div class="log-line ${levelClass} py-0.5 border-b border-gray-700/50">${escapeHtml(log)}</div>`;
                }).join('');
            }

            logCountEl.textContent = `${filteredLogs.length} / ${allLogs.length} logs`;

            if (autoScrollCheckbox.checked) {
                logsContainer.scrollTop = logsContainer.scrollHeight;
            }
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function applyFilter() {
            renderLogs();
        }

        function togglePause() {
            isPaused = !isPaused;
            pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
            statusEl.textContent = isPaused ? 'Paused' : 'Live';
            statusEl.className = isPaused
                ? 'px-3 py-1 rounded text-sm bg-yellow-600'
                : 'px-3 py-1 rounded text-sm bg-green-600';
        }

        async function clearLogs() {
            if (!confirm('Clear all debug logs?')) return;

            await fetch('/api/debug/logs', {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                },
                credentials: 'include'
            });

            allLogs = [];
            lastCount = 0;
            renderLogs();
        }

        function copyLogs() {
            const text = allLogs.join('\n');
            navigator.clipboard.writeText(text).then(() => {
                alert(`${allLogs.length} logs copied to clipboard!`);
            });
        }

        // Poll every second
        setInterval(fetchLogs, 1000);
        fetchLogs();
    </script>
</body>
</html>
