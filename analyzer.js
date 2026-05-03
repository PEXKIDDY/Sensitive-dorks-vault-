// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const btnAnalyzeFile = document.getElementById('btnAnalyzeFile');

    // File Upload Handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect(fileInput.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileSelect(e.target.files[0]);
        }
    });

    function handleFileSelect(file) {
        if (file.type !== "application/pdf") {
            alert("Please upload a valid PDF file.");
            fileInput.value = "";
            return;
        }
        dropZone.querySelector('p').textContent = `Target: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        btnAnalyzeFile.disabled = false;
    }

    // Run Analysis
    btnAnalyzeFile.addEventListener('click', async () => {
        await startAnalysis('Target: ' + fileInput.files[0].name, fileInput.files[0]);
    });

    async function startAnalysis(targetName, file) {
        const reportContainer = document.getElementById('reportContainer');
        const reportContent = document.getElementById('reportContent');
        const scanStatus = document.getElementById('scanStatus');

        // Disable inputs during scan
        btnAnalyzeFile.disabled = true;

        // Reset state
        reportContainer.classList.remove('hidden');
        scanStatus.className = 'status-badge scanning';
        scanStatus.textContent = 'Scanning...';
        scanStatus.style = ''; // reset inline styles

        reportContent.innerHTML = `
            <div class="scan-animation">
                <div class="scanner-line"></div>
                <i data-lucide="file-search" class="pulse-icon"></i>
                <p style="font-size: 1.1rem; color: #fff;">Processing Content ${targetName}...</p>
                <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.5rem;" id="scanProgressText">Routing payload and initializing structural extraction...</p>
            </div>
        `;
        lucide.createIcons();
        reportContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });

        try {
            let extractedText = "";
            let metadata = { orgName: "Unknown Entity", date: "Unknown", time: "--:--", classification: "Standard / Unclassified" };

            let pdfData = null;

            if (file) {
                document.getElementById('scanProgressText').textContent = "Reading local file payload and extracting textual assets...";
                pdfData = await extractPDFData(file);
                extractedText = pdfData.text;

                // Fallbacks
                metadata.orgName = "Local System (Unverified)";
                const d = new Date(file.lastModified);
                metadata.date = d.toLocaleDateString();
                metadata.time = d.toLocaleTimeString();

            }

            // --- Deep PDF Metadata Extraction ---
            if (pdfData && pdfData.info) {
                // Determine Original Authorship Organization
                if (pdfData.info.Author && pdfData.info.Author.trim().length > 1) {
                    metadata.orgName = pdfData.info.Author.trim() + " (PDF Author)";
                } else if (pdfData.info.Creator && pdfData.info.Creator.trim().length > 1) {
                    // Extract first word of the creator app string
                    metadata.orgName = pdfData.info.Creator.split(' ')[0] + " (Generator)";
                } else {
                    // Try to regex the company name from the document text
                    const copyMatch = extractedText.match(/Copyright\s*(?:\(c\)|\©)?\s*(?:20\d{2})?\s+([A-Z][a-zA-Z\s,]+(?:Inc\.|LLC|Corp|Ltd|Group|Company|University))/i);
                    if (copyMatch && copyMatch[1]) {
                        metadata.orgName = copyMatch[1].trim() + " (Extracted from Text)";
                    }
                }

                // Determine Original Creation Date inside the PDF binary
                if (pdfData.info.CreationDate) {
                    const dStr = pdfData.info.CreationDate; // E.g., D:20240320142233Z00'00'
                    if (dStr.startsWith("D:")) {
                        const yr = dStr.substring(2, 6);
                        const mo = dStr.substring(6, 8);
                        const da = dStr.substring(8, 10);
                        const hr = dStr.substring(10, 12) || "00";
                        const mi = dStr.substring(12, 14) || "00";
                        metadata.date = `${mo}/${da}/${yr} (Authored Timestamp)`;
                        metadata.time = `${hr}:${mi}`;
                    } else if (dStr.length > 5) {
                        metadata.date = dStr.substring(0, 15) + " (Raw Extracted)";
                    }
                } else if (pdfData.info.ModDate) {
                    const dStr = pdfData.info.ModDate;
                    if (dStr.startsWith("D:")) {
                        metadata.date = `${dStr.substring(6, 8)}/${dStr.substring(8, 10)}/${dStr.substring(2, 6)} (Modified Timestamp)`;
                        metadata.time = `${dStr.substring(10, 12)}:${dStr.substring(12, 14)}`;
                    }
                }
            }

            // --- Extract Document Classification ---
            const lowerExtract = extractedText.toLowerCase();
            if (lowerExtract.includes("highly confidential") || lowerExtract.includes("strictly confidential")) {
                metadata.classification = "Highly Confidential";
            } else if (lowerExtract.includes("do not distribute")) {
                metadata.classification = "Do Not Distribute";
            } else if (lowerExtract.includes("confidential")) {
                metadata.classification = "Confidential";
            } else if (lowerExtract.includes("proprietary")) {
                metadata.classification = "Proprietary";
            } else if (lowerExtract.includes("internal use only")) {
                metadata.classification = "Internal Use Only";
            }

            setTimeout(() => {
                const findings = analyzeText(extractedText, metadata);
                renderReport(findings, extractedText.length, metadata);
            }, 1000);

        } catch (error) {
            renderError(error.message);
        }
    }

    async function extractPDFData(fileOrBlob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async function () {
                try {
                    const typedarray = new Uint8Array(this.result);
                    const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
                    let fullText = '';

                    const metadata = await pdf.getMetadata();
                    const info = metadata.info || {};

                    document.getElementById('scanProgressText').textContent = `Extracting entity relations across ${pdf.numPages} pages...`;

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        fullText += pageText + '\n';
                    }
                    resolve({ text: fullText, info: info });
                } catch (err) {
                    reject(new Error("Failed to parse this PDF. It may be encrypted, corrupted, or an image-only scan without structural text."));
                }
            };
            reader.onerror = () => reject(new Error("Failed to read file stream."));
            reader.readAsArrayBuffer(fileOrBlob);
        });
    }

    function analyzeText(text, metadata = null) {
        const findings = {
            security: [],
            business: [],
            riskLevel: "Low",
            count: 0
        };

        const lowerText = text.toLowerCase();

        // === ADVANCED SECURITY IMPACT CHECKS (Accurate Regex) ===
        if (/(?:password|passwd|pwd|secret|api_key)\s*[:=]\s*(?:['"]?)[A-Za-z0-9!@#$%^&*()_+=-]{8,}(?:['"]?)/i.test(text)) {
            findings.security.push("<strong>Hardcoded Secrets:</strong> Found high-entropy password or secret assignments.");
            findings.count++;
            findings.riskLevel = "Critical";
        }

        // Plaintext ID and Passwords Combinations
        if (/(?:id|user(?:\s*name)?|login|email)\s*[:=]\s*\S+.*?(?:password|pwd|pass)\s*[:=]\s*\S+/is.test(text)) {
            findings.security.push("<strong>Plaintext Credentials:</strong> Detected exposed Username/ID and Password combinations.");
            findings.count++;
            findings.riskLevel = "Critical";
        }

        // Comprehensive Cloud & API Key Matching
        let cloudFindings = [];
        if (/\b(?:AKIA|ASIA|AGPA|AIDA|AROA|AIPA)[A-Z0-9]{16}\b/.test(text)) cloudFindings.push("AWS Keys");
        if (/\bAIza[0-9A-Za-z\-_]{35}\b/.test(text)) cloudFindings.push("GCP API Key");
        if (/\bxox[baprs]-[0-9A-Za-z]{10,48}\b/.test(text)) cloudFindings.push("Slack Token");
        if (/\b(?:sk|pk)_(?:live|test)_[0-9a-zA-Z]{24}\b/.test(text)) cloudFindings.push("Stripe Key");
        if (/\bgh[pusro]_[A-Za-z0-9_]{36}\b/.test(text)) cloudFindings.push("GitHub Token");

        if (cloudFindings.length > 0) {
            findings.security.push(`<strong>Cloud/API Credentials:</strong> Found exposed: ${cloudFindings.join(', ')}.`);
            findings.count++;
            findings.riskLevel = "Critical";
        }

        // Private Cryptographic Keys
        if (/-----BEGIN (RSA|OPENSSH|PGP|DSA|EC|ANY) PRIVATE KEY-----/.test(text)) {
            findings.security.push("<strong>Private Cryptographic Keys:</strong> Detected raw PKI private key markers.");
            findings.count++;
            findings.riskLevel = "Critical";
        }

        // Robust IP Address Validation
        const ipMatches = text.match(/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g);
        if (ipMatches) {
            // Filter out common false positives like version numbers (e.g. 1.0.0.0)
            const validIps = ipMatches.filter(ip => !ip.startsWith('0.') && !ip.startsWith('127.') && ip !== '1.1.1.1' && ip !== '0.0.0.0');
            if (validIps.length > 0) {
                findings.security.push(`<strong>Infrastructure Details:</strong> Found ${validIps.length} routable IP addresses.`);
                findings.count++;
                if (findings.riskLevel === "Low") findings.riskLevel = "Medium";
            }
        }

        // Exact Database URIs with embedded credentials
        const dbMatches = text.match(/\b(?:jdbc:mysql|postgres(?:ql)?|mongodb(?:[+]srv)?|redis):\/\/[a-zA-Z0-9_-]+:[^@\s]+@[a-zA-Z0-9.-]+/i);
        if (dbMatches) {
            findings.security.push("<strong>Authenticated Database URIs:</strong> Extracted connection strings containing embedded passwords.");
            findings.count++;
            findings.riskLevel = "Critical";
        }

        // Strict Email Extraction
        const emailMatches = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,8}\b/g);
        if (emailMatches) {
            const uniqueEmails = [...new Set(emailMatches)];
            findings.security.push(`<strong>PII / Identity:</strong> Extracted ${uniqueEmails.length} unique email addresses.`);
            findings.count++;
        }

        // Financial Data (Credit Cards)
        const ccMatch = text.match(/\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})\b/);
        if (ccMatch) {
            findings.security.push("<strong>Financial Data:</strong> Unmasked Credit Card Number detected.");
            findings.count++;
            findings.riskLevel = "Critical";
        }

        // Target Identification & Intelligence
        let targetCompany = null;
        const copyMatch = text.match(/Copyright\s*(?:\(c\)|\©)?\s*(?:20\d{2})?\s+([A-Z][A-Za-z0-9\s,&]+?(?:Inc\.|LLC|Corp|Ltd|Group|Company|University|Bank|Technologies))\b/i);
        if (copyMatch && copyMatch[1]) {
            targetCompany = copyMatch[1].trim();
        } else {
            const emailExtracts = text.match(/\b[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+)\.(?:com|org|net|io|co|biz|us|uk)\b/gi);
            if (emailExtracts) {
                for (let email of emailExtracts) {
                    const domainPart = email.split('@')[1].split('.')[0];
                    if (!['gmail', 'yahoo', 'hotmail', 'outlook', 'protonmail', 'icloud', 'aol', 'example', 'sentry', 'no-reply', 'noreply', 'test'].includes(domainPart.toLowerCase())) {
                        targetCompany = domainPart.charAt(0).toUpperCase() + domainPart.slice(1) + " (Extracted via Domain)";
                        break;
                    }
                }
            }
        }

        // Deep Keyword Match for Major Multi-National Corporations (MNCs)
        if (!targetCompany) {
            const mncMatch = text.match(/\b(Apple|Google|Microsoft|Amazon|Meta|Facebook|Tesla|Netflix|IBM|Oracle|Intel|Samsung|Sony|Cisco|Salesforce|Uber|Airbnb|SpaceX|Nvidia|Adobe|PayPal|Square|Stripe|Spotify|Shopify|Walmart|Target|Disney)\b/g);
            if (mncMatch) {
                targetCompany = mncMatch[0];
            }
        }

        // Fallback to PDF Metadata directly if text extraction fails
        if (!targetCompany && metadata && metadata.orgName && metadata.orgName !== "Local System (Unverified)" && metadata.orgName !== "Unknown Entity" && !metadata.orgName.includes("Extracted from Text")) {
            const potentialName = metadata.orgName.replace(/\s*\([^)]*\)$/, '');
            // Ignore generic software creator metadata
            if (!['Pages', 'Microsoft Word', 'Adobe', 'Canva', 'Jasper'].includes(potentialName)) {
                targetCompany = potentialName;
            }
        }

        if (targetCompany && targetCompany.trim().length > 0 && targetCompany !== "Unknown Entity" && targetCompany !== "null") {
            findings.business.push(`🚨 <strong>Target Organization Compromised:</strong> The exposed payload specifically belongs to or affects <strong>${targetCompany}</strong>. This explicitly links the vulnerability and extracted data to this exact corporate entity.`);
            findings.count++;
            if (findings.riskLevel === "Low" || findings.riskLevel === "Low") findings.riskLevel = "Medium";
        }

        // === LEAKAGE IMPACT / DAMAGE ASSESSMENT (Business Risk) ===
        let hasCreds = findings.security.some(f => f.includes('Hardcoded') || f.includes('Cloud Credentials') || f.includes('Private SSH'));
        let hasInfra = findings.security.some(f => f.includes('Infrastructure') || f.includes('Database URIs'));
        let hasIdentity = findings.security.some(f => f.includes('PII') || f.includes('Identity'));

        if (lowerText.includes("confidential") || lowerText.includes("proprietary") || lowerText.includes("internal use only") || lowerText.includes("do not distribute")) {
            findings.business.push("<strong>Competitive & Trust Damage:</strong> The public leak of this 'Confidential/Proprietary' document directly arms competitors with protected company strategies and destroys trust with partners or clients who entrusted this data.");
            findings.count++;
            if (findings.riskLevel !== "Critical") findings.riskLevel = "High";
        }

        const ssnMatches = text.match(/\b\d{3}-\d{2}-\d{4}\b/g);
        if (ssnMatches || hasIdentity || lowerText.includes("salary") || lowerText.includes("payroll")) {
            findings.business.push("<strong>Regulatory & Legal Fallout:</strong> The leakage of embedded PII (such as employee details, emails, or payroll data) triggers severe data privacy violations (GDPR/CCPA). The company faces mandatory public breach disclosures, massive regulatory fines, and class-action lawsuits.");
            findings.count++;
            findings.riskLevel = "Critical";
        }

        if (lowerText.includes("invoice") && (lowerText.includes("bank account") || lowerText.includes("routing number") || lowerText.includes("swift"))) {
            findings.business.push("<strong>Direct Financial Loss:</strong> Exposed wire routing profiles and invoices make the company highly susceptible to Business Email Compromise (BEC) and targeted financial fraud payloads.");
            findings.count++;
            findings.riskLevel = "High";
        }

        if (hasCreds || hasInfra) {
            findings.business.push("<strong>System Takeover & Ransom Risk:</strong> If this document is indexed by attackers, the exposed cloud credentials and database IPs grant direct footholds into the corporate network. This drastically elevates the risk of a full-scale ransomware deployment and complete system hijacking.");
            findings.riskLevel = "Critical";
        }

        if (findings.business.length === 0 && findings.count > 0) {
            findings.business.push("<strong>General Exposure Damage:</strong> The unauthorized leak of internal PDF assets provides malicious actors with operational intel, lowering the barrier for targeted spear-phishing campaigns against company employees.");
        }

        return findings;
    }

    function renderError(message) {
        const reportContent = document.getElementById('reportContent');
        const scanStatus = document.getElementById('scanStatus');

        resetInputs();

        scanStatus.className = 'status-badge';
        scanStatus.textContent = 'Scan Failed';
        scanStatus.style.background = 'rgba(255, 71, 87, 0.15)';
        scanStatus.style.color = '#ff4757';
        scanStatus.style.border = '1px solid rgba(255, 71, 87, 0.3)';

        reportContent.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <i data-lucide="alert-octagon" style="width: 48px; height: 48px; color: #ff4757; margin-bottom: 1rem;"></i>
                <h3 style="color: #fff; margin-bottom: 0.5rem;">Analysis Error</h3>
                <p style="color: var(--text-secondary);">${message}</p>
            </div>
        `;
        lucide.createIcons();
    }

    function renderReport(findings, charCount, metadata) {
        const reportContent = document.getElementById('reportContent');
        const scanStatus = document.getElementById('scanStatus');

        resetInputs();

        let headerColor = '#2ed573';
        let bgStyle = 'rgba(46, 213, 115, 0.15)';
        let statusTitle = 'Clean Document';

        if (findings.count > 0) {
            if (findings.riskLevel === 'Critical') {
                headerColor = '#ff4757';
                bgStyle = 'rgba(255, 71, 87, 0.15)';
                statusTitle = 'Critical Vulnerability';
            } else if (findings.riskLevel === 'High') {
                headerColor = '#ffa502';
                bgStyle = 'rgba(255, 165, 2, 0.15)';
                statusTitle = 'High Risk';
            } else {
                headerColor = '#ffa502';
                bgStyle = 'rgba(255, 165, 2, 0.15)';
                statusTitle = 'Medium Risk';
            }
        }

        scanStatus.className = 'status-badge complete';
        scanStatus.textContent = statusTitle;
        scanStatus.style.background = bgStyle;
        scanStatus.style.color = headerColor;
        scanStatus.style.border = `1px solid ${headerColor}`;

        const isSecret = metadata.classification !== 'Standard / Unclassified';

        const metadataHtml = `
            <div class="metadata-banner">
                <div style="flex: 1 1 100%; display: flex; justify-content: center; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
                    <i data-lucide="tag" style="color: #00f0ff;"></i>
                    <strong style="color: var(--text-secondary);">Document Classification:</strong>
                    <span style="color: ${isSecret ? '#ff4757' : '#2ed573'}; font-weight: 700; letter-spacing: 0.05em; font-family: 'Fira Code', monospace; text-shadow: 0 0 10px ${isSecret ? 'rgba(255, 71, 87, 0.5)' : 'rgba(46, 213, 115, 0.5)'};">
                        ${metadata.classification.toUpperCase()}
                    </span>
                </div>
                <div class="meta-item"><i data-lucide="building"></i> <strong>Organization:</strong> <span>${metadata.orgName}</span></div>
                <div class="meta-item"><i data-lucide="calendar"></i> <strong>Upload Date:</strong> <span>${metadata.date}</span></div>
                <div class="meta-item"><i data-lucide="clock"></i> <strong>Time:</strong> <span>${metadata.time}</span></div>
            </div>
        `;

        if (findings.count === 0 && !isSecret) {
            reportContent.innerHTML = metadataHtml + `
                <div style="text-align: center; padding: 2rem;">
                    <i data-lucide="shield-check" style="width: 48px; height: 48px; color: #2ed573; margin-bottom: 1rem;"></i>
                    <h3 style="color: #fff; margin-bottom: 0.5rem;">No Immediate Threats Detected</h3>
                    <p style="color: var(--text-secondary);">Scanned ${charCount} extracted characters and matched 0 threat signatures.</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        let secList = findings.security.map(item => `<li>${item}</li>`).join('');
        let busList = findings.business.map(item => `<li>${item}</li>`).join('');

        if (!secList) secList = `<li><span style="color: var(--text-secondary);">✓ No technical attack vectors identified.</span></li>`;
        if (!busList) busList = `<li><span style="color: var(--text-secondary);">✓ No significant business liabilities mapped.</span></li>`;

        reportContent.innerHTML = metadataHtml + `
            <div class="report-grid">
                <!-- Security Impact -->
                <div class="risk-box">
                    <h3 class="${findings.riskLevel === 'Critical' ? 'critical' : 'warning'}"><i data-lucide="alert-triangle"></i> Security Impact</h3>
                    <ul class="findings-list">
                        ${secList}
                    </ul>
                </div>
                
                <!-- Business Risk -->
                <div class="risk-box">
                    <h3 class="${findings.riskLevel === 'Critical' ? 'warning' : 'critical'}"><i data-lucide="trending-down"></i> Business Risk Assessment</h3>
                    <ul class="findings-list">
                        ${busList}
                    </ul>
                </div>
            </div>
            <p style="text-align: center; font-size: 0.8rem; color: var(--text-secondary); margin-top: 1.5rem;">Total characters analyzed: ${charCount}</p>
        `;
        lucide.createIcons();
    }

    function resetInputs() {
        if (fileInput.files.length) {
            btnAnalyzeFile.disabled = false;
        }
    }
});
