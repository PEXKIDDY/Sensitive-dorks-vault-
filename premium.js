const dorksData = [
    {
        category: "Bug Bounty Programs (USD)",
        icon: "dollar-sign",
        dorks: [
            {
                title: "Bug Bounty minimum $100 reward",
                query: 'intext:"bug bounty" intext:"reward" "$100" OR "$200" OR "$500"',
                severity: "medium"
            },
            {
                title: "High Paying Bug Bounties ($1000 - $5000)",
                query: 'intext:"bug bounty" intext:"reward" "$1000" OR "$2000" OR "$5000"',
                severity: "high"
            },
            {
                title: "Massive Bug Bounties ($5000+)",
                query: 'intext:"bug bounty" intext:"reward" "$5000" OR "$10000"',
                severity: "critical"
            },
            {
                title: "Vulnerability Disclosure Programs (USD)",
                query: '"vulnerability disclosure policy" "$100" OR "$500" OR "$1000"',
                severity: "medium"
            }
        ]
    },
    {
        category: "Bug Bounty Programs (EUR)",
        icon: "euro",
        dorks: [
            {
                title: "Bug Bounty minimum €100 reward",
                query: 'intext:"bug bounty" intext:"reward" "€100" OR "€200" OR "€500"',
                severity: "medium"
            },
            {
                title: "High Paying Bug Bounties (€1000 - €5000)",
                query: 'intext:"bug bounty" intext:"reward" "€1000" OR "€2000" OR "€5000"',
                severity: "high"
            },
            {
                title: "Massive Bug Bounties (€5000+)",
                query: 'intext:"bug bounty" intext:"reward" "€5000" OR "€10000"',
                severity: "critical"
            }
        ]
    },
    {
        category: "Swag & Hall of Fame Programs",
        icon: "award",
        dorks: [
            {
                title: "Programs Rewarding Swag",
                query: 'intext:"bug bounty" OR "vulnerability disclosure policy" intext:"reward" "swag" OR "goodies" OR "t-shirt"',
                severity: "low"
            },
            {
                title: "Public Hall of Fame",
                query: 'intext:"bug bounty" OR "security" intitle:"hall of fame" OR inurl:"hall-of-fame"',
                severity: "low"
            },
            {
                title: "Security Acknowledgement Pages",
                query: 'intitle:"security acknowledgment" OR intitle:"security acknowledgements" "vulnerability"',
                severity: "low"
            }
        ]
    },
    {
        category: "Government VDPs (Hall of Fame)",
        icon: "landmark",
        dorks: [
            {
                title: "Gov Vulnerability Disclosure",
                query: 'site:gov.* OR site:*.gov "vulnerability disclosure program" OR "vulnerability disclosure policy"',
                severity: "medium"
            },
            {
                title: "Gov Hall of Fame",
                query: 'site:gov.* OR site:*.gov "hall of fame" "security" OR "vulnerability"',
                severity: "medium"
            },
            {
                title: "Military/Defense VDPs",
                query: 'site:mil OR site:mod.* "vulnerability disclosure" OR inurl:"vdp"',
                severity: "high"
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
                <i data-lucide="${categoryData.icon}" class="category-icon" style="color: #ffd700;"></i>
                <h2>${categoryData.category}</h2>
                <span class="category-count">${categoryData.dorks.length} queries</span>
            </div>
            <div class="dorks-grid">
                ${categoryData.dorks.map((dork, i) => `
                    <div class="dork-card" style="border-color: rgba(255, 215, 0, 0.1);">
                        <div class="dork-card-header">
                            <h3 class="dork-title">${dork.title}</h3>
                        </div>
                        <div class="dork-query-container">
                            <span class="dork-query" style="color: #ffd700;">${escapeHtml(dork.query)}</span>
                        </div>
                        <div class="dork-actions">
                            <button class="btn btn-secondary" onclick="handleCopy(this, \`${escapeHtml(dork.query).replace(/\\/g, '\\\\').replace(/"/g, '&quot;')}\`)">
                                <i data-lucide="copy" class="btn-icon"></i> Copy
                            </button>
                            <button class="btn btn-primary" style="border-color: #ffd700; color: #ffd700; background: rgba(255, 215, 0, 0.1);" onclick="handleSearch(\`${escapeHtml(dork.query).replace(/\\/g, '\\\\')}\`)">
                                <i data-lucide="external-link" class="btn-icon"></i> Search
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        container.appendChild(categoryEl);
    });

    lucide.createIcons();
}

function getQueryWithDomain(baseQuery) {
    const domainInput = document.getElementById('domainInput');
    const domain = domainInput ? domainInput.value.trim() : '';
    let modifiers = '';
    if (domain) {
        modifiers += domain.startsWith('site:') ? `${domain} ` : `site:${domain} `;
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

window.copyToClipboard = function (btnElement, text) {
    navigator.clipboard.writeText(text).then(() => {
        const iconEl = btnElement.querySelector('i');
        const originalIcon = iconEl.getAttribute('data-lucide');

        iconEl.setAttribute('data-lucide', 'check');
        lucide.createIcons();

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

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
