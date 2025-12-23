
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const apiUrlInput = document.getElementById('api-url');
    const apiKeyInput = document.getElementById('api-key');
    const saveSettingsButton = document.getElementById('save-settings-button');
    const loginError = document.getElementById('login-error'); // To display feedback

    const mainContent = document.getElementById('main-content');
    const loginContent = document.getElementById('login-content');

    const usesInput = document.getElementById('uses-input');
    const createCodeButton = document.getElementById('create-code-button');
    const createCodeMessage = document.getElementById('create-code-message');

    const refreshCodesButton = document.getElementById('refresh-codes-button');
    const codesTableBody = document.getElementById('codes-table-body');

    // --- Initial State ---
    // Hide main content by default, show it after successful "login" (saving settings)
    mainContent.style.display = 'none';
    loginContent.style.display = 'block';
    loadSettings(); // Load any saved settings on page load

    // --- API Settings & "Login" ---
    function loadSettings() {
        apiUrlInput.value = localStorage.getItem('vidspri_api_url') || '';
        apiKeyInput.value = localStorage.getItem('vidspri_api_key') || '';
    }

    saveSettingsButton.addEventListener('click', async () => {
        const apiUrl = apiUrlInput.value.trim();
        const apiKey = apiKeyInput.value.trim();

        if (!apiUrl || !apiKey) {
            loginError.textContent = 'Both Server URL and API Key are required.';
            return;
        }

        // As a simple validation, try to fetch codes. If it works, "log in".
        loginError.textContent = 'Verifying...';
        try {
            const response = await fetch(`${apiUrl}/admin/codes`, {
                headers: { 'X-Admin-API-Key': apiKey }
            });

            if (response.status === 403) {
                 loginError.textContent = 'Verification failed: Invalid API Key.';
                 return;
            }
            if (!response.ok) {
                 loginError.textContent = `Verification failed: Server returned status ${response.status}. Check URL.`;
                 return;
            }

            // If successful, save settings and switch view
            localStorage.setItem('vidspri_api_url', apiUrl);
            localStorage.setItem('vidspri_api_key', apiKey);

            loginContent.style.display = 'none';
            mainContent.style.display = 'block';

            fetchCodes(); // Load codes into the table

        } catch (error) {
            loginError.textContent = 'Verification failed: Could not connect to the server.';
        }
    });

    // --- Core API Functions ---
    async function fetchCodes() {
        const apiUrl = localStorage.getItem('vidspri_api_url');
        const apiKey = localStorage.getItem('vidspri_api_key');
        if (!apiUrl || !apiKey) {
            // This case should not happen if the logic is correct
            alert('Settings not found. Please re-enter them.');
            mainContent.style.display = 'none';
            loginContent.style.display = 'block';
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/admin/codes`, {
                headers: { 'X-Admin-API-Key': apiKey }
            });
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }
            const codes = await response.json();
            renderCodesTable(codes);
        } catch (error) {
            alert(`Failed to fetch codes: ${error.message}`);
        }
    }

    function renderCodesTable(codes) {
        codesTableBody.innerHTML = '';
        if (codes.length === 0) {
            codesTableBody.innerHTML = '<tr><td colspan="3">No active codes found.</td></tr>';
            return;
        }
        codes.forEach(code => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><code>${code.code}</code></td>
                <td>${code.uses_remaining} / ${code.total_uses}</td>
                <td><button class="delete-button" data-code="${code.code}">Delete</button></td>
            `;
            codesTableBody.appendChild(row);
        });
    }

    refreshCodesButton.addEventListener('click', fetchCodes);

    // --- Create Code ---
    createCodeButton.addEventListener('click', async () => {
        const uses = parseInt(usesInput.value, 10);
        if (isNaN(uses) || uses <= 0) {
            createCodeMessage.textContent = 'Please enter a valid number of uses.';
            createCodeMessage.style.color = '#cf6679';
            return;
        }

        const apiUrl = localStorage.getItem('vidspri_api_url');
        const apiKey = localStorage.getItem('vidspri_api_key');

        createCodeMessage.textContent = 'Generating...';
        createCodeMessage.style.color = '#ccc';

        try {
            const response = await fetch(`${apiUrl}/admin/codes`, {
                method: 'POST',
                headers: {
                    'X-Admin-API-Key': apiKey,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({ uses })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.detail || 'Failed to create code.');
            }
            createCodeMessage.textContent = `New code created: ${result.code}`;
            createCodeMessage.style.color = '#03dac6';
            fetchCodes(); // Refresh the list
        } catch (error) {
            createCodeMessage.textContent = `Error: ${error.message}`;
            createCodeMessage.style.color = '#cf6679';
        }
    });

    // --- Delete Code ---
    codesTableBody.addEventListener('click', async (event) => {
        if (event.target.classList.contains('delete-button')) {
            const code = event.target.dataset.code;
            if (!confirm(`Are you sure you want to delete the code ${code}?`)) {
                return;
            }

            const apiUrl = localStorage.getItem('vidspri_api_url');
            const apiKey = localStorage.getItem('vidspri_api_key');

            try {
                const response = await fetch(`${apiUrl}/admin/codes/${code}`, {
                    method: 'DELETE',
                    headers: { 'X-Admin-API-Key': apiKey }
                });
                if (!response.ok) {
                    const result = await response.json();
                    throw new Error(result.detail || 'Failed to delete code.');
                }
                alert(`Code ${code} deleted successfully.`);
                fetchCodes(); // Refresh the list
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        }
    });
});
