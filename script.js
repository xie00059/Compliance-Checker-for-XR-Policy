// VR/AR Privacy Policy Compliance Assistant
// Global state management
const ComplianceState = {
    currentStep: 1,
    totalSteps: 10,
    projectId: null,
    apiKey: '',  // Main API key storage
    continueWithoutKey: false,
    keyValidated: false,
    projectData: {
        appName: '',
        appDescription: '',
        domain: 'vr/ar',
        policyText: '',
        region: '',
        riskResult: null,
        activeChecklist: [],
        interviewerPersona: 'regulatory-generalist',
        developerPersona: 'legally-unaware',
        scenarios: [],
        transcript: [],
        coverageState: {},
        factLog: [],
        conflictsLog: [],
        redlines: []
    }
};



// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    generateProjectId();
});

function initializeApp() {
    updateProgressBar();
    createStepIndicators();
    
    // Set today's date and generate project ID
    ComplianceState.projectId = 'proj_' + Date.now().toString(36);
}

function generateProjectId() {
    ComplianceState.projectId = 'vrar_' + Math.random().toString(36).substr(2, 9);
}

function createStepIndicators() {
    const container = document.getElementById('stepIndicators');
    if (!container) return;
    
    container.innerHTML = '';
    
    for (let i = 1; i <= ComplianceState.totalSteps; i++) {
        const indicator = document.createElement('div');
        indicator.className = 'step-indicator';
        indicator.textContent = i;
        
        if (i < ComplianceState.currentStep) {
            indicator.classList.add('completed');
        } else if (i === ComplianceState.currentStep) {
            indicator.classList.add('active');
        }
        
        container.appendChild(indicator);
    }
}

function updateProgressBar() {
    const progressFill = document.getElementById('progressFill');
    const progress = ((ComplianceState.currentStep - 1) / (ComplianceState.totalSteps - 1)) * 100;
    
    if (progressFill) {
        progressFill.style.width = progress + '%';
    }
    
    createStepIndicators();
}

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.textContent.toLowerCase().replace(' ', '');
            switchTab(tab === 'pastetext' ? 'paste' : 'upload');
        });
    });

    // File upload handling
    const fileInput = document.getElementById('policyFile');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    // Form data capture
    document.getElementById('appName')?.addEventListener('input', (e) => {
        ComplianceState.projectData.appName = e.target.value;
    });
    
    document.getElementById('appDescription')?.addEventListener('input', (e) => {
        ComplianceState.projectData.appDescription = e.target.value;
    });
    
    document.getElementById('gptApiKey')?.addEventListener('input', (e) => {
        ComplianceState.apiKey = e.target.value;
        ComplianceState.keyValidated = false;
        updateNavigationState();
    });
    
    document.getElementById('continueWithoutKey')?.addEventListener('change', (e) => {
        ComplianceState.continueWithoutKey = e.target.checked;
        updateNavigationState();
    });
    
    document.getElementById('policyText')?.addEventListener('input', (e) => {
        ComplianceState.projectData.policyText = e.target.value;
    });
    
    document.getElementById('region')?.addEventListener('change', (e) => {
        ComplianceState.projectData.region = e.target.value;
    });
}

// Step navigation functions
function nextStep() {
    if (!validateCurrentStep()) {
        return;
    }
    
    if (ComplianceState.currentStep < ComplianceState.totalSteps) {
        document.getElementById(`step${ComplianceState.currentStep}`).classList.remove('active');
        ComplianceState.currentStep++;
        document.getElementById(`step${ComplianceState.currentStep}`).classList.add('active');
        
        updateProgressBar();
        handleStepEntry();
    }
}

function prevStep() {
    if (ComplianceState.currentStep > 1) {
        document.getElementById(`step${ComplianceState.currentStep}`).classList.remove('active');
        ComplianceState.currentStep--;
        document.getElementById(`step${ComplianceState.currentStep}`).classList.add('active');
        
        updateProgressBar();
    }
}

function validateCurrentStep() {
    switch (ComplianceState.currentStep) {
        case 1:
            return validateStep1();
        case 2:
            return validateStep2();
        default:
            return true;
    }
}

function validateStep1() {
    const appName = document.getElementById('appName').value.trim();
    const appDescription = document.getElementById('appDescription').value.trim();
    
    if (!appName) {
        alert('Please enter your app name');
        return false;
    }
    
    if (!appDescription) {
        alert('Please enter your app description');
        return false;
    }
    
    // Check API key requirements
    if (!ComplianceState.apiKey && !ComplianceState.continueWithoutKey) {
        showNavigationMessage('Please provide an API key or check \"Continue without key\" to proceed.', 'warning');
        return false;
    }
    
    // Update the project data
    ComplianceState.projectData.appName = appName;
    ComplianceState.projectData.appDescription = appDescription;
    
    return true;
}

// Navigation state management
function updateNavigationState() {
    const apiKey = document.getElementById('gptApiKey').value.trim();
    const continueWithoutKey = document.getElementById('continueWithoutKey').checked;
    
    ComplianceState.apiKey = apiKey;
    ComplianceState.continueWithoutKey = continueWithoutKey;
    
    if (!apiKey && !continueWithoutKey) {
        showNavigationMessage('Please provide an API key or check \"Continue without key\" to proceed.', 'warning');
    } else if (!apiKey && continueWithoutKey) {
        showNavigationMessage('You can proceed, but analysis will use reduced accuracy keyword-based detection.', 'info');
    } else {
        hideNavigationMessage();
    }
}

function showNavigationMessage(message, type) {
    const messageDiv = document.getElementById('navigationMessage');
    messageDiv.textContent = message;
    messageDiv.className = `navigation-message ${type}`;
    messageDiv.style.display = 'block';
}

function hideNavigationMessage() {
    const messageDiv = document.getElementById('navigationMessage');
    messageDiv.style.display = 'none';
}

// API Key validation
async function validateApiKey() {
    const apiKey = document.getElementById('gptApiKey').value.trim();
    const statusDiv = document.getElementById('apiKeyStatus');
    const validateBtn = document.getElementById('validateKeyBtn');
    
    if (!apiKey) {
        showApiKeyStatus('Please enter an API key first.', 'error');
        return;
    }
    
    if (!apiKey.startsWith('sk-')) {
        showApiKeyStatus('API key should start with \"sk-\"', 'error');
        return;
    }
    
    // Show testing status
    validateBtn.disabled = true;
    showApiKeyStatus('Testing API key...', 'testing');
    
    try {
        const startTime = Date.now();
        const testResult = await testOpenAIConnection(apiKey);
        const latency = Date.now() - startTime;
        
        if (testResult.success) {
            ComplianceState.keyValidated = true;
            showApiKeyStatus(`✅ Valid! Model: ${testResult.model}, Latency: ${latency}ms`, 'success');
            
            // Open test modal
            showTestKeyModal({
                success: true,
                model: testResult.model,
                latency: latency,
                organization: testResult.organization || 'N/A'
            });
        } else {
            ComplianceState.keyValidated = false;
            showApiKeyStatus(`❌ ${testResult.error}`, 'error');
        }
    } catch (error) {
        ComplianceState.keyValidated = false;
        showApiKeyStatus(`❌ Network error: ${error.message}`, 'error');
        console.error('API key validation error:', error);
    } finally {
        validateBtn.disabled = false;
    }
}

function showApiKeyStatus(message, type) {
    const statusDiv = document.getElementById('apiKeyStatus');
    statusDiv.textContent = message;
    statusDiv.className = `api-key-status ${type}`;
    statusDiv.style.display = 'block';
}

// Test OpenAI connection
async function testOpenAIConnection(apiKey) {
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: `OpenAI API error: ${response.status} ${errorData.error?.message || response.statusText}`
            };
        }
        
        const data = await response.json();
        const gpt4Model = data.data.find(model => model.id.includes('gpt-4')) || data.data[0];
        
        return {
            success: true,
            model: gpt4Model ? gpt4Model.id : 'Available',
            organization: response.headers.get('openai-organization')
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message.includes('CORS') 
                ? 'CORS blocked - this may work in the actual risk analysis'
                : error.message
        };
    }
}

// Test Key Modal Functions
function showTestKeyModal(result) {
    const modal = document.getElementById('testKeyModal');
    const modalBody = document.getElementById('testKeyModalBody');
    
    if (result.success) {
        modalBody.innerHTML = `
            <div class="test-results">
                <div class="success-icon">✅</div>
                <h4>API Key Valid!</h4>
                <div class="metrics">
                    <div><strong>Model:</strong> ${result.model}</div>
                    <div><strong>Latency:</strong> ${result.latency}ms</div>
                    <div><strong>Organization:</strong> ${result.organization}</div>
                    <div><strong>Status:</strong> Ready for analysis</div>
                </div>
                <p>Your API key is working correctly and ready for high-quality AI-assisted analysis.</p>
            </div>
        `;
    } else {
        modalBody.innerHTML = `
            <div class="test-results">
                <div class="error-icon">❌</div>
                <h4>API Key Test Failed</h4>
                <p>${result.error}</p>
                <p>You can still continue with keyword-based analysis.</p>
            </div>
        `;
    }
    
    modal.style.display = 'flex';
}

function closeTestKeyModal() {
    const modal = document.getElementById('testKeyModal');
    modal.style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('testKeyModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

function validateStep2() {
    const policyText = document.getElementById('policyText').value.trim();
    const region = document.getElementById('region').value;
    
    if (!policyText && !document.getElementById('policyFile').files[0]) {
        alert('Please provide your privacy policy through one of the available methods');
        return false;
    }
    
    if (!region) {
        alert('Please select your regulatory region');
        return false;
    }
    
    return true;
}

function handleStepEntry() {
    switch (ComplianceState.currentStep) {
        case 3:
            performRiskScreening();
            break;
        case 4:
            setupChecklistScope();
            break;
        case 6:
            generateScenarios();
            break;
        case 7:
            initializeInterview();
            break;
        case 8:
            generateCoverageReport();
            break;
        case 9:
            generateRedlines();
            break;
        case 10:
            setupExportSummary();
            break;
    }
}

// Tab switching functionality
function switchTab(tabName) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab and content
    const tabMap = {
        'paste': 'Paste Text',
        'upload': 'Upload PDF'
    };
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.textContent === tabMap[tabName]) {
            btn.classList.add('active');
        }
    });
    
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// File upload handler with PDF text extraction
async function handleFileUpload(event) {
    const file = event.target.files[0];
    const pdfStatus = document.getElementById('pdfStatus');
    const pdfPreview = document.getElementById('pdfPreview');
    const pdfTextContent = document.getElementById('pdfTextContent');
    
    if (!file) {
        hidePdfPreview();
        return;
    }
    
    if (file.type !== 'application/pdf') {
        showPdfStatus('Please select a PDF file', 'error');
        hidePdfPreview();
        return;
    }
    
    try {
        showPdfStatus('Processing PDF...', 'loading');
        hidePdfPreview();
        
        const extractedText = await extractTextFromPDF(file);
        
        if (extractedText && extractedText.trim().length > 0) {
            // Store the extracted text in the project data
            ComplianceState.projectData.policyText = extractedText;
            
            // Show success status
            showPdfStatus(`✅ PDF processed successfully (${extractedText.length} characters extracted)`, 'success');
            
            // Show text preview
            showPdfPreview(extractedText);
            
        } else {
            showPdfStatus('⚠️ No text could be extracted from this PDF. It might be an image-based PDF.', 'warning');
            hidePdfPreview();
        }
        
    } catch (error) {
        console.error('PDF processing error:', error);
        showPdfStatus(`❌ Error processing PDF: ${error.message}`, 'error');
        hidePdfPreview();
    }
}

// Extract text from PDF using PDF.js
async function extractTextFromPDF(file) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        
        fileReader.onload = async function(e) {
            try {
                const arrayBuffer = e.target.result;
                
                // Configure PDF.js worker
                if (typeof pdfjsLib !== 'undefined') {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    
                    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                    let fullText = '';
                    
                    // Extract text from each page
                    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                        const page = await pdf.getPage(pageNum);
                        const textContent = await page.getTextContent();
                        
                        const pageText = textContent.items
                            .map(item => item.str)
                            .join(' ')
                            .trim();
                            
                        if (pageText) {
                            fullText += pageText + '\n\n';
                        }
                    }
                    
                    resolve(fullText.trim());
                } else {
                    reject(new Error('PDF.js library not loaded'));
                }
                
            } catch (error) {
                reject(error);
            }
        };
        
        fileReader.onerror = () => reject(new Error('Failed to read file'));
        fileReader.readAsArrayBuffer(file);
    });
}

// Show PDF processing status
function showPdfStatus(message, type) {
    const pdfStatus = document.getElementById('pdfStatus');
    pdfStatus.textContent = message;
    pdfStatus.className = `pdf-status ${type}`;
    pdfStatus.style.display = 'block';
}

// Show PDF text preview
function showPdfPreview(text) {
    const pdfPreview = document.getElementById('pdfPreview');
    const pdfTextContent = document.getElementById('pdfTextContent');
    
    // Show the entire extracted text
    pdfTextContent.textContent = text;
    pdfPreview.style.display = 'block';
}

// Hide PDF preview
function hidePdfPreview() {
    const pdfPreview = document.getElementById('pdfPreview');
    const pdfStatus = document.getElementById('pdfStatus');
    pdfPreview.style.display = 'none';
    pdfStatus.style.display = 'none';
    
    // Clear the policy text if it was from a PDF
    if (ComplianceState.projectData.policyText && 
        ComplianceState.projectData.policyText.includes('[PDF content')) {
        ComplianceState.projectData.policyText = '';
    }
}

// Step 3: High-Risk Screening
async function performRiskScreening() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const riskAssessment = document.getElementById('riskAssessment');
    const nextBtn = document.getElementById('step3Next');
    
    loadingSpinner.style.display = 'block';
    riskAssessment.style.display = 'none';
    nextBtn.disabled = true;
    
    try {
        const riskResult = await analyzeRiskWithGPT(ComplianceState.projectData.policyText);
        ComplianceState.projectData.riskResult = riskResult;
        
        displayRiskResults(riskResult);
        
        loadingSpinner.style.display = 'none';
        riskAssessment.style.display = 'block';
        nextBtn.disabled = false;
    } catch (error) {
        console.error('Risk screening error:', error);
        // Fallback handled within analyzeRiskWithGPT
        loadingSpinner.style.display = 'none';
        riskAssessment.style.display = 'block';
        nextBtn.disabled = false;
    }
}

// Fixed GPT API Integration for High-Risk Detection
async function analyzeRiskWithGPT(policyText) {
    const apiKey = ComplianceState.apiKey;
    
    console.log('Starting risk analysis:', { hasKey: !!apiKey, continueWithoutKey: ComplianceState.continueWithoutKey });
    
    // If no API key provided, use fallback
    if (!apiKey) {
        if (ComplianceState.continueWithoutKey) {
            showFallbackBanner('Proceeding with reduced accuracy (no API key provided). Falling back to keyword detection.');
            return analyzeRiskFallback(policyText);
        } else {
            throw new Error('No API key provided and continue without key not enabled');
        }
    }
    
    try {
        // Construct the risk prompt based on risk_prompt.py
        const systemPrompt = constructRiskPrompt();
        
        const response = await callGPTAPI(apiKey, systemPrompt, policyText);
        
        // Try to parse as JSON first, then fallback to text parsing
        const parsedResult = parseGPTResponse(response);
        
        if (parsedResult && parsedResult.is_high_risk_signal !== undefined) {
            console.log('Successfully parsed GPT response:', {
                riskSignal: parsedResult.is_high_risk_signal,
                signalsCount: parsedResult.signals?.length || 0,
                hasRationale: !!parsedResult.rationale
            });
            return convertGPTResultToDisplayFormat(parsedResult);
        } else {
            // If parsing fails, fall back to keyword detection
            console.error('GPT response validation failed:', parsedResult);
            showFallbackBanner('Malformed JSON in model output. Falling back to keyword detection.');
            return analyzeRiskFallback(policyText);
        }
        
    } catch (error) {
        console.error('GPT API call failed:', error);
        
        // Provide specific error messages
        let errorMessage = 'Could not reach GPT';
        if (error.message.includes('401')) {
            errorMessage = 'OpenAI returned an error: Invalid API key (401)';
        } else if (error.message.includes('429')) {
            errorMessage = 'OpenAI returned an error: Rate limit exceeded (429)';
        } else if (error.message.includes('CORS')) {
            errorMessage = 'Network/CORS error - API call blocked by browser';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Network error: Request timeout';
        }
        
        showFallbackBanner(`${errorMessage}. Falling back to keyword detection.`);
        return analyzeRiskFallback(policyText);
    }
}

// Get the risk prompt from the external file
function constructRiskPrompt() {
    // Use the prompt from high_risk_prompt.js
    if (typeof HIGH_RISK_SYSTEM_PROMPT !== 'undefined') {
        return HIGH_RISK_SYSTEM_PROMPT + `

Additionally, provide your result as a JSON object:
{
  "is_high_risk_signal": true|false,
  "signals":[
    {"type":"purpose|sensitive_data","detail":"...","quote":"...", "start":123,"end":156}
  ],
  "rationale":"..."
}`;
    } else {
        console.error('HIGH_RISK_SYSTEM_PROMPT not loaded from high_risk_prompt.js');
        // Fallback to a basic prompt if the external file failed to load
        return `You are a compliance auditor. Analyze the following VR/AR privacy policy for EU AI Act high-risk signals. Respond with JSON: {"is_high_risk_signal": boolean, "signals": [], "rationale": "..."}`;
    }
}

// Call GPT API with proper error handling and timeouts
async function callGPTAPI(apiKey, systemPrompt, policyText) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
    
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',  // Use gpt-4o for better performance
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: `Privacy Policy Text to Analyze:\n${'='.repeat(50)}\n${policyText}\n${'='.repeat(50)}`
                    }
                ],
                temperature: 0.1,
                max_tokens: 2000,
                seed: 42  // For more consistent responses
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`${response.status} ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
        
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('timeout - Request took too long');
        }
        throw error;
    }
}

// Parse GPT response with enhanced error handling and validation
function parseGPTResponse(response) {
    if (!response || typeof response !== 'string') {
        console.error('Invalid response format:', typeof response);
        return null;
    }

    let parsedResult = null;
    
    try {
        // First try to parse the entire response as JSON
        parsedResult = JSON.parse(response);
    } catch (error) {
        console.log('Direct JSON parse failed, trying extraction...');
        
        // Try to extract JSON from markdown code fences
        let jsonText = response;
        
        // Remove markdown code fences if present
        jsonText = jsonText.replace(/```json\s*/gi, '').replace(/```\s*$/g, '');
        jsonText = jsonText.replace(/```\s*/g, '');
        
        // Try to find JSON object in the response
        const jsonMatches = [
            jsonText.match(/\{[\s\S]*\}/), // Full object match
            jsonText.match(/\{[^}]*"is_high_risk_signal"[^}]*\}/), // Specific match for our expected format
        ];
        
        for (const match of jsonMatches) {
            if (match) {
                try {
                    parsedResult = JSON.parse(match[0]);
                    console.log('Successfully extracted JSON from response');
                    break;
                } catch (innerError) {
                    console.log('Failed to parse extracted JSON:', innerError.message);
                    continue;
                }
            }
        }
        
        if (!parsedResult) {
            console.error('Could not parse GPT response as JSON:', error.message);
            console.error('Response content:', response.substring(0, 200) + '...');
            return null;
        }
    }
    
    // Validate the parsed result has required fields
    return validateGPTResponse(parsedResult);
}

// Validate and sanitize GPT response structure
function validateGPTResponse(result) {
    if (!result || typeof result !== 'object') {
        console.error('Invalid result object:', result);
        return null;
    }
    
    // Check for required field (with fallbacks for common variants)
    const highRiskKeys = ['is_high_risk_signal', 'is_high_risk', 'high_risk_signal', 'high_risk'];
    let isHighRisk = false;
    
    for (const key of highRiskKeys) {
        if (result[key] !== undefined) {
            isHighRisk = Boolean(result[key]);
            break;
        }
    }
    
    // Ensure signals is an array
    let signals = result.signals || result.risk_signals || result.findings || [];
    if (!Array.isArray(signals)) {
        console.warn('Signals field is not an array, converting:', signals);
        signals = signals ? [signals] : [];
    }
    
    // Clean up signals array
    signals = signals.filter(signal => signal !== null && signal !== undefined);
    
    // Get rationale with fallback names
    const rationale = result.rationale || result.reasoning || result.explanation || result.summary || '';
    
    const validatedResult = {
        is_high_risk_signal: isHighRisk,
        signals: signals,
        rationale: String(rationale)
    };
    
    console.log('Validated GPT response:', {
        hasHighRiskField: isHighRisk !== undefined,
        signalsCount: signals.length,
        rationaleLength: rationale.length
    });
    
    return validatedResult;
}

// Convert GPT result to display format with robust signal field mapping
function convertGPTResultToDisplayFormat(gptResult) {
    const isHighRisk = gptResult.is_high_risk_signal;
    const signals = gptResult.signals || [];
    const rationale = gptResult.rationale || '';

    let riskLevel = 'low-risk';
    let reasons = [rationale];

    if (isHighRisk) {
        if (signals.length >= 3) {
            riskLevel = 'high-risk';
        } else if (signals.length > 0) {
            riskLevel = 'potential-risk';
        } else {
            riskLevel = 'high-risk';
        }
        
        // Add specific signal details with robust field mapping
        if (signals.length > 0) {
            reasons.push(`Found ${signals.length} risk signal(s):`);
            signals.forEach(signal => {
                const normalizedSignal = normalizeSignalFields(signal);
                if (normalizedSignal.type && normalizedSignal.detail) {
                    reasons.push(`- ${normalizedSignal.type}: ${normalizedSignal.detail}`);
                } else {
                    // Fallback for malformed signals
                    const fallbackText = extractSignalText(signal);
                    if (fallbackText) {
                        reasons.push(`- ${fallbackText}`);
                    }
                }
            });
        }
    } else {
        reasons = ['GPT analysis indicates no high-risk AI Act violations', rationale];
    }

    return {
        level: riskLevel,
        reasons: reasons.filter(r => r && r.length > 0),
        indicators: signals.map(s => {
            const normalized = normalizeSignalFields(s);
            return normalized.detail || extractSignalText(s) || 'Signal detected';
        }).filter(Boolean),
        gptResult: gptResult  // Store the original GPT result
    };
}

// Normalize signal fields to handle variant key names
function normalizeSignalFields(signal) {
    if (!signal || typeof signal !== 'object') {
        return { type: 'unknown', detail: String(signal || 'Invalid signal') };
    }

    // Map various possible field names to standard ones
    const typeKeys = ['type', 'signal_type', 'category', 'classification', 'kind'];
    const detailKeys = ['detail', 'description', 'reason', 'explanation', 'content', 'text', 'message'];
    
    let type = null;
    let detail = null;
    
    // Find the type field
    for (const key of typeKeys) {
        if (signal[key]) {
            type = String(signal[key]);
            break;
        }
    }
    
    // Find the detail field
    for (const key of detailKeys) {
        if (signal[key]) {
            detail = String(signal[key]);
            break;
        }
    }
    
    // Fallback: use the first string value found if no standard fields
    if (!type || !detail) {
        const stringValues = Object.entries(signal)
            .filter(([key, value]) => typeof value === 'string' && value.length > 0)
            .map(([key, value]) => ({ key, value }));
            
        if (stringValues.length >= 2) {
            type = type || stringValues[0].value;
            detail = detail || stringValues[1].value;
        } else if (stringValues.length === 1) {
            if (!type) type = 'risk_signal';
            if (!detail) detail = stringValues[0].value;
        }
    }
    
    return {
        type: type || 'unknown_type',
        detail: detail || 'Unknown risk signal detected',
        quote: signal.quote || '',
        start: signal.start || 0,
        end: signal.end || 0
    };
}

// Extract readable text from malformed signal objects
function extractSignalText(signal) {
    if (!signal) return null;
    
    if (typeof signal === 'string') {
        return signal;
    }
    
    if (typeof signal === 'object') {
        // Try to find any meaningful string content
        const stringValues = Object.values(signal)
            .filter(value => typeof value === 'string' && value.length > 0)
            .filter(value => !['true', 'false', 'null', 'undefined'].includes(value.toLowerCase()));
            
        if (stringValues.length > 0) {
            return stringValues.join(': ');
        }
        
        // Last resort: stringify the object
        try {
            return JSON.stringify(signal);
        } catch (e) {
            return 'Malformed signal data';
        }
    }
    
    return String(signal);
}

// Show fallback banner in UI
function showFallbackBanner(message) {
    // Remove any existing fallback banners first
    const existingBanner = document.querySelector('.fallback-banner');
    if (existingBanner) {
        existingBanner.remove();
    }
    
    const riskAssessment = document.getElementById('riskAssessment');
    const bannerDiv = document.createElement('div');
    bannerDiv.className = 'fallback-banner';
    bannerDiv.innerHTML = `
        <span class="icon">⚠️</span>
        ${message}
    `;
    
    // Insert banner at the beginning of risk assessment
    if (riskAssessment) {
        riskAssessment.insertBefore(bannerDiv, riskAssessment.firstChild);
    }
}

// Fallback keyword-based risk analysis
function analyzeRiskFallback(policyText) {
    // Keyword-based risk analysis based on high_risk_detection.py fallback logic
    const riskIndicators = [
        'biometric',
        'facial recognition',
        'eye tracking',
        'behavioral analysis',
        'location tracking',
        'voice recording',
        'machine learning',
        'artificial intelligence',
        'third party',
        'data sharing',
        'physiological',
        'gaze data',
        'heart rate',
        'body temperature',
        'fingerprint',
        'voiceprint',
        'iris scan'
    ];
    
    const text = policyText.toLowerCase();
    const foundIndicators = riskIndicators.filter(indicator => text.includes(indicator));
    
    let riskLevel = 'low-risk';
    let reasons = [];
    
    if (foundIndicators.length === 0) {
        riskLevel = 'low-risk';
        reasons = ['No high-risk indicators detected in policy text (keyword-based analysis)'];
    } else if (foundIndicators.length <= 3) {
        riskLevel = 'potential-risk';
        reasons = [
            `Found ${foundIndicators.length} potential risk indicators (keyword-based analysis)`,
            'VR/AR applications typically involve immersive data collection',
            `Detected keywords: ${foundIndicators.join(', ')}`
        ];
    } else {
        riskLevel = 'high-risk';
        reasons = [
            `Found ${foundIndicators.length} high-risk indicators (keyword-based analysis)`,
            'Multiple data collection mechanisms detected',
            'Complex VR/AR data processing identified',
            `Detected keywords: ${foundIndicators.join(', ')}`
        ];
    }
    
    return {
        level: riskLevel,
        reasons: reasons,
        indicators: foundIndicators,
        fallbackUsed: true
    };
}

function displayRiskResults(riskResult) {
    const riskBadge = document.getElementById('riskBadge');
    const riskReasons = document.getElementById('riskReasons');
    
    // Set risk badge with analysis method chip
    const chipClass = riskResult.fallbackUsed ? 'heuristic' : 'ai-assisted';
    const chipText = riskResult.fallbackUsed ? 'Heuristic fallback' : 'AI-assisted';
    
    riskBadge.className = `risk-badge ${riskResult.level}`;
    riskBadge.innerHTML = `
        ${riskResult.level.replace('-', ' ')}
        <span class="analysis-method-chip ${chipClass}">${chipText}</span>
        ${riskResult.fallbackUsed && ComplianceState.continueWithoutKey ? '<span class="reduced-accuracy-badge">Reduced accuracy</span>' : ''}
    `;
    
    // Add analysis method indicator
    const analysisMethod = riskResult.fallbackUsed ? 'Keyword-based Analysis' : 'GPT-4 AI Analysis';
    
    // Display reasons
    riskReasons.innerHTML = `
        <h4>Risk Assessment Details</h4>
        <p><small><strong>Analysis Method:</strong> ${analysisMethod}</small></p>
        <ul>
            ${riskResult.reasons.map(reason => `<li>${reason}</li>`).join('')}
        </ul>
    `;
}

// Step 4: Checklist Scope
function setupChecklistScope() {
    const checklistPreview = document.getElementById('checklistPreview');
    const riskLevel = ComplianceState.projectData.riskResult?.level || 'low-risk';
    
    let selectedChecklist;
    let riskPath = '';
    
    // Determine which checklist to use based on risk level
    if (riskLevel === 'high-risk' || riskLevel === 'potential-risk') {
        selectedChecklist = COMPLIANCE_CHECKLISTS.high;
        riskPath = 'HIGH RISK PATH';
    } else {
        selectedChecklist = COMPLIANCE_CHECKLISTS.low;
        riskPath = 'LOW RISK PATH';
    }
    
    // Store the active checklist and reset dependent state
    ComplianceState.projectData.activeChecklist = selectedChecklist.items;
    
    // Reset coverage state to match new checklist items
    ComplianceState.projectData.coverageState = {};
    selectedChecklist.items.forEach(item => {
        ComplianceState.projectData.coverageState[item.id] = {
            status: 'pending',
            questions: [],
            responses: [],
            lastUpdated: null
        };
    });
    
    // Build the UI
    checklistPreview.innerHTML = `
        <h3>Selected Framework: ${selectedChecklist.name} 
            <span class="risk-path-chip">${riskPath}</span>
        </h3>
        <p class="framework-reason">Chosen because Step 3 assessed your app as <strong>${riskLevel.replace('-', ' ')}</strong>.</p>
        <div class="checklist-items">
            ${selectedChecklist.items.map(item => `
                <div class="checklist-item">
                    <div class="checklist-item-id">${item.id}</div>
                    <div class="checklist-item-text">${item.text}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// Step 6: Scenario Generation
async function generateScenarios() {
    const scenarioLoading = document.getElementById('scenarioLoading');
    const scenariosList = document.getElementById('scenariosList');
    const nextBtn = document.getElementById('step6Next');
    
    scenarioLoading.style.display = 'block';
    scenariosList.style.display = 'none';
    nextBtn.disabled = true;
    
    // Simulate scenario generation
    setTimeout(() => {
        const scenarios = generateGherkinScenarios();
        ComplianceState.projectData.scenarios = scenarios;
        
        displayScenarios(scenarios);
        
        scenarioLoading.style.display = 'none';
        scenariosList.style.display = 'block';
        nextBtn.disabled = false;
    }, 2500);
}

function generateGherkinScenarios() {
    const scenarios = [
        {
            title: 'Data Collection Consent',
            content: `Given a user launches the VR application
When they are presented with data collection options  
Then they must provide explicit consent before any data is processed
And the consent mechanism must be GDPR-compliant`,
            tags: ['1.1', '2.1']
        },
        {
            title: 'Biometric Data Processing',
            content: `Given the app collects biometric data (eye tracking, facial recognition)
When this data is processed for personalization
Then specific safeguards must be documented
And users must be informed of biometric data use`,
            tags: ['5.1', '1.2']
        },
        {
            title: 'Cross-Border Data Transfer',
            content: `Given user data is transferred outside the EU
When the transfer occurs for cloud processing
Then adequate safeguards must be in place
And users must be notified of international transfers`,
            tags: ['3.1', '1.3']
        },
        {
            title: 'Real-Time Processing Transparency',
            content: `Given the VR app processes data in real-time
When environmental scanning occurs continuously  
Then users must be informed of ongoing data collection
And processing purposes must be clearly disclosed`,
            tags: ['6.1', '4.2']
        },
        {
            title: 'Data Subject Rights Exercise',
            content: `Given a user wants to exercise their GDPR rights
When they request data deletion or portability
Then the app must provide clear mechanisms
And respond within the required timeframe`,
            tags: ['1.2', '2.2']
        }
    ];
    
    return scenarios;
}

function displayScenarios(scenarios) {
    const scenariosList = document.getElementById('scenariosList');
    
    scenariosList.innerHTML = scenarios.map((scenario, index) => `
        <div class="scenario-item">
            <div class="scenario-title">Scenario ${index + 1}: ${scenario.title}</div>
            <div class="scenario-content">${scenario.content}</div>
            <div class="scenario-tags">
                ${scenario.tags.map(tag => `<span class="scenario-tag">${tag}</span>`).join('')}
            </div>
        </div>
    `).join('');
}

// Step 7: Interview System
function initializeInterview() {
    // Initialize coverage state
    ComplianceState.projectData.activeChecklist.forEach(item => {
        ComplianceState.projectData.coverageState[item.id] = {
            questionsUsed: 0,
            status: 'not_asked',
            evidence: []
        };
    });
    
    updateInterviewProgress();
    startNextQuestion();
}

function updateInterviewProgress() {
    const progressStats = document.getElementById('progressStats');
    const checklistProgress = document.getElementById('checklistProgress');
    
    const totalItems = ComplianceState.projectData.activeChecklist.length;
    const completedItems = Object.values(ComplianceState.projectData.coverageState)
        .filter(state => state.status === 'complete').length;
    const inProgressItems = Object.values(ComplianceState.projectData.coverageState)
        .filter(state => state.status === 'asked').length;
    
    progressStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Total Items:</span>
            <span class="stat-value">${totalItems}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Completed:</span>
            <span class="stat-value">${completedItems}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">In Progress:</span>
            <span class="stat-value">${inProgressItems}</span>
        </div>
    `;
    
    checklistProgress.innerHTML = ComplianceState.projectData.activeChecklist.map(item => {
        const state = ComplianceState.projectData.coverageState[item.id];
        const statusClass = state.status === 'complete' ? 'complete' : 
                           state.status === 'asked' ? 'in-progress' : '';
        
        return `
            <div class="progress-item ${statusClass}">
                <span>${item.id}</span>
                <span class="question-count">${state.questionsUsed}/3</span>
            </div>
        `;
    }).join('');
}

function startNextQuestion() {
    // Find next item to question
    const nextItem = ComplianceState.projectData.activeChecklist.find(item => {
        const state = ComplianceState.projectData.coverageState[item.id];
        return state.status === 'not_asked' && state.questionsUsed < 3;
    });
    
    if (!nextItem) {
        // Interview complete
        document.getElementById('step7Next').disabled = false;
        addToTranscript('system', 'Interview completed. All checklist items have been addressed.');
        return;
    }
    
    const question = generateQuestion(nextItem);
    addToTranscript('interviewer', question);
    
    // Mark as asked
    ComplianceState.projectData.coverageState[nextItem.id].status = 'asked';
    ComplianceState.projectData.coverageState[nextItem.id].questionsUsed++;
    
    updateInterviewProgress();
    
    // Enable send button
    document.getElementById('sendBtn').disabled = false;
}

function generateQuestion(item) {
    const persona = ComplianceState.projectData.interviewerPersona;
    
    const questionsByPersona = {
        'legal-expert': {
            '1.1': 'Under Article 6(1) of GDPR, what specific lawful basis does your VR application rely on for processing personal data? Please cite the exact legal basis and explain how it\'s documented in your privacy policy.',
            '1.2': 'How does your privacy policy comply with Articles 13 and 14 of GDPR regarding information provision to data subjects, particularly for VR-specific data collection?',
            '1.3': 'What are your data retention periods in compliance with Article 5(1)(e) of GDPR, and how do you justify these periods under the proportionality principle?',
            '2.1': 'Walk me through your consent mechanism under Article 7 of GDPR - how do you ensure consent is freely given, specific, informed, and unambiguous in your VR environment?',
            '2.2': 'How do you handle data portability requests under Article 20 of GDPR for VR interaction data, and what technical measures do you have in place?',
            '3.1': 'For international data transfers, which Chapter V mechanism do you rely on - adequacy decisions, appropriate safeguards, or derogations under Article 49?',
            '4.1': 'Under the EU AI Act, how have you classified your AI system, and what conformity assessment procedures have you implemented?',
            '4.2': 'How do you ensure compliance with AI Act transparency obligations under Articles 13 and 52 for real-time AI processing?',
            '5.1': 'Given that biometric data is special category data under Article 9 of GDPR, what specific legal basis and safeguards have you implemented?',
            '5.2': 'Have you conducted a DPIA under Article 35 of GDPR for your VR application, particularly regarding biometric processing?',
            '6.1': 'How do you ensure compliance with the principle of transparency under Article 5(1)(a) for real-time data processing in VR environments?'
        },
        'technical-auditor': {
            '1.1': 'What technical measures are in place to ensure data minimization, and how do you verify that only necessary data is processed?',
            '1.2': 'What encryption standards and key management practices do you use for protecting user data at rest and in transit?',
            '1.3': 'How is automated data deletion implemented in your system architecture, and what backup/recovery procedures affect retention?',
            '2.1': 'What technical implementation supports your consent management - can you show me the system architecture for consent capture and withdrawal?',
            '2.2': 'What data export formats and APIs do you provide for data portability, and how do you ensure data integrity during transfer?',
            '3.1': 'What technical safeguards secure international data transfers - encryption protocols, network security, and access controls?',
            '4.1': 'What technical documentation exists for your AI algorithms, and how do you ensure algorithmic accountability?',
            '4.2': 'How do you technically implement real-time transparency - logging, user notifications, and audit trails?',
            '5.1': 'What specific technical safeguards protect biometric data - hashing, encryption, anonymization techniques?',
            '5.2': 'How does your system architecture prevent unauthorized access to sensitive VR data, and what monitoring is in place?',
            '6.1': 'What technical mechanisms notify users about real-time processing, and how do you log these interactions?'
        },
        'ethics-specialist': {
            '1.1': 'How do you ensure fairness and non-discrimination in your data processing practices, particularly for vulnerable users?',
            '1.2': 'How do you make privacy information accessible and understandable for all users, including those with disabilities?',
            '1.3': 'How do you balance business interests with user privacy rights when setting retention periods?',
            '2.1': 'How do you ensure consent is meaningful and not coercive, especially for immersive VR experiences?',
            '2.2': 'How do you ensure data portability doesn\'t disadvantage users or create barriers to switching services?',
            '3.1': 'How do you ensure international transfers don\'t compromise user rights or expose them to surveillance risks?',
            '4.1': 'How do you address potential bias and discrimination in your AI systems, particularly for diverse user groups?',
            '4.2': 'How do you ensure AI transparency promotes user understanding rather than just meeting legal requirements?',
            '5.1': 'How do you ensure biometric data collection doesn\'t create discriminatory outcomes or infringe on human dignity?',
            '5.2': 'What measures prevent your VR system from being used for surveillance or manipulation of users?',
            '6.1': 'How do you ensure real-time processing transparency empowers rather than overwhelms users with information?'
        },
        'regulatory-generalist': {
            '1.1': 'Can you explain in simple terms why you collect user data and how this benefits users?',
            '1.2': 'How would a regular user find out what rights they have regarding their data in your app?',
            '1.3': 'How long do you keep user data, and can users easily understand why?',
            '2.1': 'When users start using your VR app, how do they agree to data collection? Is this process clear?',
            '2.2': 'If I wanted to take my data to a different VR app, how would I do that?',
            '3.1': 'Do you send user data to other countries? How do you keep it safe when you do?',
            '4.1': 'Does your app use AI? How do you make sure it\'s working fairly for all users?',
            '4.2': 'When your app makes automatic decisions about users, how do they know this is happening?',
            '5.1': 'Your app probably tracks things like eye movements - how do you protect this sensitive information?',
            '5.2': 'What privacy risks does VR create that regular apps don\'t have? How do you address these?',
            '6.1': 'How do users know what data is being collected while they\'re using your VR app?'
        }
    };
    
    const questions = questionsByPersona[persona] || questionsByPersona['regulatory-generalist'];
    return questions[item.id] || `Please explain how your privacy policy addresses: ${item.text}`;
}

function sendToDeveloper() {
    const lastQuestion = ComplianceState.projectData.transcript[ComplianceState.projectData.transcript.length - 1];
    
    // Generate developer response
    const response = generateDeveloperResponse();
    addToTranscript('developer', response);
    
    // Check for conflicts
    const conflict = detectConflicts(response);
    if (conflict) {
        addToTranscript('conflict', conflict);
        ComplianceState.projectData.conflictsLog.push({
            question: lastQuestion.content,
            answer: response,
            conflict: conflict,
            turn: ComplianceState.projectData.transcript.length
        });
    }
    
    // Record fact
    recordFact(lastQuestion.content, response);
    
    // Disable send button and continue
    document.getElementById('sendBtn').disabled = true;
    
    setTimeout(() => {
        startNextQuestion();
    }, 1000);
}

function generateDeveloperResponse() {
    const persona = ComplianceState.projectData.developerPersona;
    
    const responsesByPersona = {
        'legally-aware': [
            "We process personal data based on legitimate interest as outlined in Article 6(1)(f) of GDPR, specifically for improving VR experience quality and system performance.",
            "Our consent mechanism complies with GDPR Article 7 requirements - we obtain explicit, informed consent before any biometric data processing begins.",
            "We've implemented data portability measures under Article 20, though I should clarify our current technical limitations with the legal team.",
            "For AI Act compliance, we've classified our system as limited risk and implemented appropriate transparency measures, though we're still reviewing the biometric identification components.",
            "Our data retention periods follow the proportionality principle - we keep interaction data for 18 months and delete biometric identifiers after each session, as documented in our privacy policy."
        ],
        'legally-unaware': [
            "We collect basic usage analytics through our VR platform, but I'm not entirely sure about the specific legal basis. I think it's legitimate interest?",
            "Users can contact us via email to request their data, though we haven't implemented an automated system yet.",
            "We use Google Analytics and some third-party VR tracking services, but I'd need to check the exact data transfer details with our backend team.",
            "Our privacy policy covers the basics, but we might need to add more specific language about VR data collection.",
            "We do collect eye tracking data for user experience optimization, but I'm not sure if we explicitly mention biometric data protections.",
            "Data retention is handled by our cloud provider's default settings. We haven't set specific retention periods yet."
        ],
        'technical-oriented': [
            "The gaze data is anonymized at the sensor level using SHA-256 hashing before transmission to our analytics pipeline.",
            "We implement end-to-end encryption with AES-256 for all biometric data streams, so privacy risks are minimal from a technical standpoint.",
            "Our system uses differential privacy algorithms to ensure individual users can't be re-identified from aggregated VR behavior patterns.",
            "Data is processed locally on-device first, then only statistical summaries are uploaded to our secure cloud infrastructure with TLS 1.3.",
            "We've architected the system with zero-knowledge protocols - even we can't decrypt individual user biometric signatures.",
            "The retention is technically driven - we purge data when our ML models reach convergence, typically after 10,000 training iterations."
        ],
        'business-oriented': [
            "We use this data primarily for personalization and delivering better targeted experiences - users love the customized VR environments we create.",
            "The data helps us optimize ad placement within VR spaces and increase user engagement metrics, which directly improves ROI for our advertising partners.",
            "Honestly, most users don't really care about retention periods as long as they get a great VR experience. Our focus is on user satisfaction.",
            "We collect comprehensive behavioral data because it allows us to create more immersive, profitable VR experiences that users actually want to use.",
            "The biometric data is incredibly valuable for understanding user preferences and emotional responses - it's a key competitive advantage for us.",
            "From a business perspective, the more data we collect, the better we can serve users and generate revenue. Privacy concerns are secondary to user experience."
        ]
    };
    
    const responses = responsesByPersona[persona] || responsesByPersona['legally-unaware'];
    return responses[Math.floor(Math.random() * responses.length)];
}

function detectConflicts(response) {
    const conflictKeywords = ['not sure', 'might need', 'haven\'t implemented', 'I think', 'default settings'];
    const hasConflict = conflictKeywords.some(keyword => response.toLowerCase().includes(keyword));
    
    if (hasConflict) {
        return 'Potential gap detected: Response indicates uncertainty or incomplete implementation. This may require clarification in the privacy policy.';
    }
    
    return null;
}

function recordFact(topic, value) {
    ComplianceState.projectData.factLog.push({
        topic: extractTopic(topic),
        value: value,
        scope: 'policy_compliance',
        quote: value.substring(0, 50) + '...',
        turn: ComplianceState.projectData.transcript.length
    });
}

function extractTopic(question) {
    if (question.includes('lawful basis')) return 'lawful_basis';
    if (question.includes('consent')) return 'consent_mechanism';
    if (question.includes('retention')) return 'data_retention';
    if (question.includes('biometric')) return 'biometric_data';
    if (question.includes('transfer')) return 'data_transfer';
    return 'general_compliance';
}

function addToTranscript(role, content) {
    ComplianceState.projectData.transcript.push({
        role: role,
        content: content,
        timestamp: new Date().toISOString(),
        turn: ComplianceState.projectData.transcript.length + 1
    });
    
    displayTranscript();
}

function displayTranscript() {
    const transcript = document.getElementById('transcript');
    
    transcript.innerHTML = ComplianceState.projectData.transcript.map(item => `
        <div class="transcript-item ${item.role}">
            <div class="transcript-role">${item.role}</div>
            <div class="transcript-content">${item.content}</div>
        </div>
    `).join('');
    
    transcript.scrollTop = transcript.scrollHeight;
}

function skipQuestion() {
    startNextQuestion();
}

// Step 8: Coverage Report
function generateCoverageReport() {
    const coverageTable = document.getElementById('coverageTable');
    
    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Evidence</th>
                    <th>Policy Quote</th>
                </tr>
            </thead>
            <tbody>
                ${ComplianceState.projectData.activeChecklist.map(item => {
                    const state = ComplianceState.projectData.coverageState[item.id];
                    const status = determineItemStatus(item.id);
                    const evidence = getItemEvidence(item.id);
                    const quote = getRelevantQuote(item.id);
                    
                    return `
                        <tr>
                            <td><strong>${item.id}</strong></td>
                            <td>${item.text}</td>
                            <td><span class="coverage-status ${status.toLowerCase()}">${status}</span></td>
                            <td>${evidence}</td>
                            <td><em>"${quote}"</em></td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    coverageTable.innerHTML = tableHTML;
}

function determineItemStatus(itemId) {
    const state = ComplianceState.projectData.coverageState[itemId];
    const relatedFacts = ComplianceState.projectData.factLog.filter(fact => 
        fact.topic.includes(itemId) || fact.value.toLowerCase().includes(itemId)
    );
    
    if (relatedFacts.length === 0 || state.questionsUsed === 0) {
        return 'Unknown';
    }
    
    // Simple heuristic based on response content
    const responses = relatedFacts.map(fact => fact.value.toLowerCase());
    const positiveKeywords = ['yes', 'implemented', 'documented', 'compliant', 'clear'];
    const negativeKeywords = ['no', 'not sure', 'haven\'t', 'might need', 'unclear'];
    
    const hasPositive = responses.some(response => 
        positiveKeywords.some(keyword => response.includes(keyword))
    );
    const hasNegative = responses.some(response => 
        negativeKeywords.some(keyword => response.includes(keyword))
    );
    
    if (hasPositive && !hasNegative) return 'Yes';
    if (hasNegative) return 'No';
    return 'Unknown';
}

function getItemEvidence(itemId) {
    const relatedTranscript = ComplianceState.projectData.transcript.filter(item => 
        item.role === 'developer'
    );
    
    if (relatedTranscript.length > 0) {
        return relatedTranscript[0].content.substring(0, 50) + '...';
    }
    
    return 'No evidence collected';
}

function getRelevantQuote(itemId) {
    // Mock policy quote extraction
    const quotes = {
        '1.1': 'We process personal data based on legitimate interest',
        '1.2': 'Users have the right to access, rectify, and delete their data',
        '1.3': 'Data is retained for 24 months after last use',
        '2.1': 'Users must provide explicit consent before data collection',
        '2.2': 'Data portability requests are processed within 30 days'
    };
    
    return quotes[itemId] || 'No relevant quote found';
}

// Step 9: Redlines Generation
async function generateRedlines() {
    const redlineLoading = document.getElementById('redlineLoading');
    const redlinesContent = document.getElementById('redlinesContent');
    
    redlineLoading.style.display = 'block';
    redlinesContent.style.display = 'none';
    
    setTimeout(() => {
        const redlines = createRedlines();
        ComplianceState.projectData.redlines = redlines;
        
        displayRedlines(redlines);
        
        redlineLoading.style.display = 'none';
        redlinesContent.style.display = 'block';
    }, 3000);
}

function createRedlines() {
    const gaps = identifyPolicyGaps();
    const redlines = [];
    
    gaps.forEach(gap => {
        redlines.push({
            section: gap.section,
            title: gap.title,
            suggestion: gap.suggestion,
            type: gap.type
        });
    });
    
    return redlines;
}

function identifyPolicyGaps() {
    const gaps = [];
    
    // Analyze coverage results for gaps
    Object.entries(ComplianceState.projectData.coverageState).forEach(([itemId, state]) => {
        const status = determineItemStatus(itemId);
        
        if (status === 'No' || status === 'Unknown') {
            const item = ComplianceState.projectData.activeChecklist.find(i => i.id === itemId);
            
            if (itemId === '1.1') {
                gaps.push({
                    section: 'Legal Basis',
                    title: 'Clarify Lawful Basis for Processing',
                    suggestion: 'We process your personal data based on [INSERT SPECIFIC LEGAL BASIS - e.g., legitimate interest for improving VR experience, consent for personalized content, contract for service delivery]. This processing is necessary for [INSERT PURPOSE].',
                    type: 'addition'
                });
            } else if (itemId === '5.1') {
                gaps.push({
                    section: 'Biometric Data',
                    title: 'Add Biometric Data Protection Clause',
                    suggestion: 'Our VR application may collect biometric identifiers including eye-tracking data, hand gesture patterns, and facial recognition data. This sensitive data is processed with enhanced security measures including encryption at rest and in transit, limited access controls, and automated deletion after [INSERT TIMEFRAME].',
                    type: 'addition'
                });
            } else if (itemId === '6.1') {
                gaps.push({
                    section: 'Real-Time Processing',
                    title: 'Disclose Real-Time Data Processing',
                    suggestion: 'During VR sessions, we continuously process environmental scanning data, movement patterns, and interaction data in real-time to deliver immersive experiences. You will receive ongoing indicators when such processing occurs.',
                    type: 'addition'
                });
            }
        }
    });
    
    return gaps;
}

function displayRedlines(redlines) {
    const redlinesContent = document.getElementById('redlinesContent');
    
    redlinesContent.innerHTML = redlines.map((redline, index) => `
        <div class="redline-section">
            <div class="redline-title">${redline.section}: ${redline.title}</div>
            <div class="redline-content">
                <button class="redline-copy-btn" onclick="copyRedline(${index})">Copy</button>
                <div class="redline-diff">
                    <span class="redline-addition">${redline.suggestion}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function copyRedline(index) {
    const redline = ComplianceState.projectData.redlines[index];
    navigator.clipboard.writeText(redline.suggestion).then(() => {
        alert('Redline text copied to clipboard!');
    });
}

// Step 10: Export Functions
function setupExportSummary() {
    const exportSummary = document.getElementById('exportSummary');
    
    const completedItems = Object.values(ComplianceState.projectData.coverageState)
        .filter(state => state.status === 'complete').length;
    const totalItems = ComplianceState.projectData.activeChecklist.length;
    const riskLevel = ComplianceState.projectData.riskResult?.level || 'unknown';
    
    exportSummary.innerHTML = `
        <h3>Compliance Analysis Complete</h3>
        <div class="summary-stats">
            <p><strong>App:</strong> ${ComplianceState.projectData.appName}</p>
            <p><strong>Risk Level:</strong> ${riskLevel.replace('-', ' ').toUpperCase()}</p>
            <p><strong>Framework:</strong> ${totalItems > 6 ? 'Strict (AI Act + GDPR)' : 'GDPR Only'}</p>
            <p><strong>Coverage:</strong> ${completedItems}/${totalItems} items addressed</p>
            <p><strong>Conflicts:</strong> ${ComplianceState.projectData.conflictsLog.length} detected</p>
            <p><strong>Redlines:</strong> ${ComplianceState.projectData.redlines.length} suggested improvements</p>
        </div>
    `;
}

function downloadReport(type) {
    let content, filename, mimeType;
    
    switch (type) {
        case 'json':
            content = JSON.stringify(ComplianceState.projectData, null, 2);
            filename = `${ComplianceState.projectId}_project.json`;
            mimeType = 'application/json';
            break;
            
        case 'transcript':
            content = generateTranscriptMarkdown();
            filename = `${ComplianceState.projectId}_transcript.md`;
            mimeType = 'text/markdown';
            break;
            
        case 'coverage':
            content = generateCoverageCSV();
            filename = `${ComplianceState.projectId}_coverage.csv`;
            mimeType = 'text/csv';
            break;
            
        case 'redlines':
            content = generateRedlinesMarkdown();
            filename = `${ComplianceState.projectId}_redlines.md`;
            mimeType = 'text/markdown';
            break;
    }
    
    downloadFile(content, filename, mimeType);
}

function generateTranscriptMarkdown() {
    let markdown = `# VR/AR Compliance Interview Transcript\n\n`;
    markdown += `**Project:** ${ComplianceState.projectData.appName}\n`;
    markdown += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
    markdown += `**Risk Level:** ${ComplianceState.projectData.riskResult?.level || 'Unknown'}\n\n`;
    
    markdown += `## Interview Log\n\n`;
    
    ComplianceState.projectData.transcript.forEach((item, index) => {
        markdown += `### Turn ${index + 1} - ${item.role.toUpperCase()}\n\n`;
        markdown += `${item.content}\n\n`;
        
        if (item.role === 'conflict') {
            markdown += `> **⚠️ Conflict Detected**\n\n`;
        }
    });
    
    if (ComplianceState.projectData.conflictsLog.length > 0) {
        markdown += `## Conflicts Summary\n\n`;
        ComplianceState.projectData.conflictsLog.forEach((conflict, index) => {
            markdown += `${index + 1}. **Turn ${conflict.turn}:** ${conflict.conflict}\n\n`;
        });
    }
    
    return markdown;
}

function generateCoverageCSV() {
    let csv = 'Item ID,Description,Status,Questions Asked,Evidence\n';
    
    ComplianceState.projectData.activeChecklist.forEach(item => {
        const state = ComplianceState.projectData.coverageState[item.id];
        const status = determineItemStatus(item.id);
        const evidence = getItemEvidence(item.id).replace(/,/g, ';');
        
        csv += `${item.id},"${item.text}",${status},${state.questionsUsed},"${evidence}"\n`;
    });
    
    return csv;
}

function generateRedlinesMarkdown() {
    let markdown = `# VR/AR Privacy Policy Redlines\n\n`;
    markdown += `**Project:** ${ComplianceState.projectData.appName}\n`;
    markdown += `**Date:** ${new Date().toISOString().split('T')[0]}\n\n`;
    
    ComplianceState.projectData.redlines.forEach((redline, index) => {
        markdown += `## ${index + 1}. ${redline.section}: ${redline.title}\n\n`;
        markdown += `**Suggested Addition:**\n\n`;
        markdown += `${redline.suggestion}\n\n`;
        markdown += `---\n\n`;
    });
    
    return markdown;
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadAll() {
    ['json', 'transcript', 'coverage', 'redlines'].forEach((type, index) => {
        setTimeout(() => downloadReport(type), index * 500);
    });
}

function resetProject() {
    if (confirm('Are you sure you want to start a new project? All current data will be lost.')) {
        location.reload();
    }
}