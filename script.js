const dorksData = [
    {
        category: "Confidential Documents",
        icon: "file-text",
        dorks: [
            {
                title: "Strictly Confidential PDFs",
                query: 'ext:pdf intext:"strictly confidential" OR intext:"highly confidential"',
                severity: "high"
            },
            {
                title: "Internal Use Only Documents",
                query: 'ext:pdf OR ext:docx OR ext:xlsx intext:"internal use only" OR intext:"not for public release"',
                severity: "high"
            },
            {
                title: "Proprietary Information",
                query: 'intext:"proprietary and confidential" ext:doc OR ext:docx OR ext:pdf',
                severity: "medium"
            },
            {
                title: "Confidential Excel Sheets",
                query: 'ext:xlsx intext:"confidential" OR intext:"do not distribute"',
                severity: "high"
            },
            {
                title: "Confidential Memos/Briefs",
                query: 'intitle:"confidential memo" OR intitle:"confidential brief" ext:pdf OR ext:docx',
                severity: "high"
            },
            {
                title: "Board Meeting Minutes",
                query: 'intitle:"board of directors" "minutes" "confidential" ext:pdf',
                severity: "high"
            }
        ]
    },
    {
        category: "Credentials & Secrets",
        icon: "key",
        dorks: [
            {
                title: "Exposed Env Variables",
                query: 'filetype:env intext:"DB_PASSWORD" OR intext:"AWS_ACCESS_KEY_ID"',
                severity: "critical"
            },
            {
                title: "Password Files",
                query: 'ext:txt OR ext:csv intext:"password" OR intext:"credentials" intitle:"index of"',
                severity: "critical"
            },
            {
                title: "SSH Private Keys",
                query: 'intitle:"index of" "id_rsa" OR "id_dsa" OR "id_ecdsa"',
                severity: "critical"
            },
            {
                title: "Database Dumps with Passwords",
                query: 'ext:sql intext:"INSERT INTO users" intext:"password"',
                severity: "high"
            },
            {
                title: "Web.config Connection Strings",
                query: 'filetype:config inurl:web.config intext:connectionStrings intext:password',
                severity: "critical"
            },
            {
                title: "API Keys & Tokens",
                query: 'intext:"api_key" OR intext:"api_secret" OR intext:"auth_token" ext:json OR ext:txt',
                severity: "critical"
            }
        ]
    },
    {
        category: "Financial & Employee Data",
        icon: "wallet",
        dorks: [
            {
                title: "Salary & Payroll Lists",
                query: 'ext:xls OR ext:xlsx intitle:"salary" OR intitle:"payroll" "confidential"',
                severity: "critical"
            },
            {
                title: "Employee Performance Reviews",
                query: 'ext:pdf OR ext:doc "performance review" "confidential"',
                severity: "high"
            },
            {
                title: "Financial Statements",
                query: 'ext:pdf OR ext:xlsx "income statement" OR "balance sheet" "confidential" OR "internal use only"',
                severity: "medium"
            },
            {
                title: "Bank Statements/Details",
                query: 'ext:pdf intext:"account number" intext:"routing number" "confidential"',
                severity: "critical"
            }
        ]
    },
    {
        category: "Server & Directory Listings",
        icon: "server",
        dorks: [
            {
                title: "Admin Directories",
                query: 'intitle:"index of" "admin" OR "administrator"',
                severity: "high"
            },
            {
                title: "Backup Directories",
                query: 'intitle:"index of" "backup" OR "bak" OR "sql"',
                severity: "high"
            },
            {
                title: "Private/Hidden Directories",
                query: 'intitle:"index of" "private" OR "hidden" OR "internal"',
                severity: "medium"
            },
            {
                title: "Server Logs",
                query: 'intitle:"index of" "/var/log" OR ext:log "error" OR "warning"',
                severity: "medium"
            }
        ]
    }
];

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    renderDorks(dorksData);
});

// Render the dork categories and cards
function renderDorks(data) {
    const container = document.getElementById('dorksContainer');
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <i data-lucide="search-x" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No matching dorks found.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    data.forEach((categoryData, catIndex) => {
        if (categoryData.dorks.length === 0) return;

        const categoryEl = document.createElement('div');
        categoryEl.className = 'category-section';
        categoryEl.style.animationDelay = `${catIndex * 0.1}s`;

        categoryEl.innerHTML = `
            <div class="category-header">
                <i data-lucide="${categoryData.icon}" class="category-icon"></i>
                <h2>${categoryData.category}</h2>
                <span class="category-count">${categoryData.dorks.length} queries</span>
            </div>
            <div class="dorks-grid">
                ${categoryData.dorks.map((dork, i) => `
                    <div class="dork-card">
                        <div class="dork-card-header">
                            <h3 class="dork-title">${dork.title}</h3>
                        </div>
                        <div class="dork-query-container">
                            <span class="dork-query">${escapeHtml(dork.query)}</span>
                        </div>
                        <div class="dork-actions">
                            <button class="btn btn-secondary" onclick="handleCopy(this, \`${escapeHtml(dork.query).replace(/\\/g, '\\\\').replace(/"/g, '&quot;')}\`)">
                                <i data-lucide="copy" class="btn-icon"></i> Copy
                            </button>
                            <button class="btn btn-primary" onclick="handleSearch(\`${escapeHtml(dork.query).replace(/\\/g, '\\\\')}\`)">
                                <i data-lucide="external-link" class="btn-icon"></i> Search
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        container.appendChild(categoryEl);
    });

    // Re-initialize icons for newly added elements
    lucide.createIcons();
}

// Domain & Timeline Injection Logic
function getQueryWithDomain(baseQuery) {
    const domainInput = document.getElementById('domainInput');
    const timelineSelect = document.getElementById('timelineSelect');

    const domain = domainInput ? domainInput.value.trim() : '';
    const timeline = timelineSelect ? timelineSelect.value : '';

    let modifiers = '';

    if (domain) {
        modifiers += domain.startsWith('site:') ? `${domain} ` : `site:${domain} `;
    }

    if (timeline) {
        const date = new Date();
        if (timeline === '24h') date.setDate(date.getDate() - 1);
        else if (timeline === '48h') date.setDate(date.getDate() - 2);
        else if (timeline === '1w') date.setDate(date.getDate() - 7);
        else if (timeline === '1m') date.setMonth(date.getMonth() - 1);
        else if (timeline === '1y') date.setFullYear(date.getFullYear() - 1);

        const dateString = date.toISOString().split('T')[0];
        modifiers += `after:${dateString} `;
    }

    return `${modifiers}${baseQuery}`.trim();
}

window.handleSearch = function (baseQuery) {
    const finalQuery = getQueryWithDomain(baseQuery);
    window.open('https://www.google.com/search?q=' + encodeURIComponent(finalQuery), '_blank');
};

window.handleCopy = function (btnElement, baseQuery) {
    const finalQuery = getQueryWithDomain(baseQuery);
    copyToClipboard(btnElement, finalQuery);
};

// Global copy function
window.copyToClipboard = function (btnElement, text) {
    navigator.clipboard.writeText(text).then(() => {
        // Change icon temporarily
        const iconEl = btnElement.querySelector('i');
        const originalIcon = iconEl.getAttribute('data-lucide');

        iconEl.setAttribute('data-lucide', 'check');
        lucide.createIcons();

        // Show toast
        const toast = document.getElementById('toast');
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            iconEl.setAttribute('data-lucide', 'copy');
            lucide.createIcons();
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
};

// Utility to escape HTML
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
