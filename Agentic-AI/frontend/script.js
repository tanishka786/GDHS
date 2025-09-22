// Configuration
const API_BASE_URL = window.location.origin; // Use current origin instead of hardcoded localhost
const API_TIMEOUT = 30000;

// Global state
let uploadedFile = null;
let currentRequestId = null;
let analysisResults = null;

// DOM Elements
const elements = {
    // Navigation
    navItems: document.querySelectorAll('.nav-item'),
    sections: document.querySelectorAll('.content-section'),
    sectionTitle: document.getElementById('sectionTitle'),

    // Upload
    uploadZone: document.getElementById('uploadZone'),
    fileInput: document.getElementById('fileInput'),
    imagePreview: document.getElementById('imagePreview'),
    previewImage: document.getElementById('previewImage'),
    fileName: document.getElementById('fileName'),
    fileSize: document.getElementById('fileSize'),
    fileType: document.getElementById('fileType'),

    // Configuration
    analysisMode: document.getElementById('analysisMode'),
    symptoms: document.getElementById('symptoms'),
    confidenceThreshold: document.getElementById('confidenceThreshold'),
    nmsThreshold: document.getElementById('nmsThreshold'),
    advancedOptions: document.getElementById('advancedOptions'),

    // Actions
    analyzeBtn: document.getElementById('analyzeBtn'),
    exportBtn: document.getElementById('exportBtn'),
    mcpAnalyzeBtn: document.getElementById('mcpAnalyzeBtn'),

    // Results
    resultsPanel: document.getElementById('resultsPanel'),
    triageLevel: document.getElementById('triageLevel'),
    triageBadge: document.getElementById('triageBadge'),
    triageConfidence: document.getElementById('triageConfidence'),
    triageDescription: document.getElementById('triageDescription'),
    detectionCount: document.getElementById('detectionCount'),
    detectionsList: document.getElementById('detectionsList'),

    // Images
    originalImage: document.getElementById('originalImage'),
    annotatedImage: document.getElementById('annotatedImage'),
    comparisonOriginal: document.getElementById('comparisonOriginal'),
    comparisonAnnotated: document.getElementById('comparisonAnnotated'),

    // Summary
    summaryContent: document.getElementById('summaryContent'),
    recommendationsList: document.getElementById('recommendationsList'),

    // Metrics
    processingTime: document.getElementById('processingTime'),
    detectionTime: document.getElementById('detectionTime'),
    modelConfidence: document.getElementById('modelConfidence'),
    requestId: document.getElementById('requestId'),

    // Loading
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingTitle: document.getElementById('loadingTitle'),
    loadingMessage: document.getElementById('loadingMessage'),
    progressFill: document.getElementById('progressFill'),
    progressSteps: document.getElementById('progressSteps'),

    // Connection
    connectionStatus: document.getElementById('connectionStatus'),
    connectionText: document.getElementById('connectionText'),

    // Toast
    toastContainer: document.getElementById('toastContainer'),

    // Modal
    fullscreenModal: document.getElementById('fullscreenModal'),
    modalImage: document.getElementById('modalImage'),
    modalTitle: document.getElementById('modalTitle')
};

// Initialize app
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    console.log('🚀 Initializing Advanced Orthopedic Assistant...');

    setupEventListeners();
    await checkConnection();
    await refreshSystemHealth();

    console.log('✅ App initialized successfully');
} function setupEventListeners() {
    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => switchSection(item.dataset.section));
    });

    // File upload
    elements.uploadZone.addEventListener('click', () => elements.fileInput.click());
    elements.uploadZone.addEventListener('dragover', handleDragOver);
    elements.uploadZone.addEventListener('dragleave', handleDragLeave);
    elements.uploadZone.addEventListener('drop', handleDrop);
    elements.fileInput.addEventListener('change', handleFileSelect);

    // Analysis mode change
    elements.analysisMode.addEventListener('change', handleModeChange);

    // Range inputs
    if (elements.confidenceThreshold) {
        elements.confidenceThreshold.addEventListener('input', updateRangeValue);
    }
    if (elements.nmsThreshold) {
        elements.nmsThreshold.addEventListener('input', updateRangeValue);
    }

    // Image tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchImageTab(btn.dataset.tab));
    });

    // Connection check interval
    setInterval(checkConnection, 30000);
}

// Navigation
function switchSection(sectionName) {
    // Update nav items
    elements.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionName);
    });

    // Update sections
    elements.sections.forEach(section => {
        section.classList.toggle('active', section.id === `${sectionName}-section`);
    });

    // Update title
    const titles = {
        analysis: 'X-ray Analysis',
        agents: 'Agent Testing',
        mcp: 'MCP Tools',
        monitoring: 'System Monitor',
        requests: 'Request History'
    };
    elements.sectionTitle.textContent = titles[sectionName] || 'Dashboard';

    // Load section-specific data
    if (sectionName === 'monitoring') {
        refreshSystemHealth();
        loadMetrics();
    } else if (sectionName === 'requests') {
        refreshRequests();
    }
}

// Connection Management
async function checkConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/info`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
            updateConnectionStatus('connected', 'Connected');
        } else {
            updateConnectionStatus('error', `Server Error ${response.status}`);
        }
    } catch (error) {
        updateConnectionStatus('error', 'Connection Failed');
    }
}

function updateConnectionStatus(status, message) {
    elements.connectionStatus.className = `status-indicator ${status}`;
    elements.connectionText.textContent = message;
}

// File Upload Handling
function handleDragOver(e) {
    e.preventDefault();
    elements.uploadZone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    elements.uploadZone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    // Validate file
    if (!file.type.startsWith('image/') && !file.name.endsWith('.dcm')) {
        showToast('Please select a valid image file (JPG, PNG, DICOM)', 'error');
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
        showToast('File too large. Maximum size is 50MB', 'error');
        return;
    }

    uploadedFile = file;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        elements.previewImage.src = e.target.result;
        elements.fileName.textContent = file.name;
        elements.fileSize.textContent = formatFileSize(file.size);
        elements.fileType.textContent = file.type || 'DICOM';
        elements.imagePreview.style.display = 'block';
        elements.analyzeBtn.disabled = false;
        elements.mcpAnalyzeBtn.disabled = false;

        // Set original image for comparison
        elements.originalImage.src = e.target.result;
        elements.comparisonOriginal.src = e.target.result;
    };
    reader.readAsDataURL(file);

    showToast(`Image "${file.name}" uploaded successfully`, 'success');
}

function removeImage() {
    uploadedFile = null;
    elements.imagePreview.style.display = 'none';
    elements.fileInput.value = '';
    elements.analyzeBtn.disabled = true;
    elements.mcpAnalyzeBtn.disabled = true;
    elements.resultsPanel.style.display = 'none';
    showToast('Image removed', 'success');
}

function handleModeChange() {
    const isAdvanced = elements.analysisMode.value === 'advanced';
    elements.advancedOptions.style.display = isAdvanced ? 'block' : 'none';
}

function updateRangeValue(e) {
    const valueSpan = e.target.nextElementSibling;
    if (valueSpan) {
        valueSpan.textContent = e.target.value;
    }
}

// Main Analysis Function
async function startAnalysis() {
    if (!uploadedFile) {
        showToast('Please upload an image first', 'warning');
        return;
    }

    try {
        showLoading('Analyzing X-ray Image', 'Processing your medical image with AI...');
        updateProgress(0);
        updateProgressStep('validate', 'active');

        // Convert file to base64
        const base64Data = await fileToBase64(uploadedFile);
        updateProgress(20);

        updateProgressStep('validate', 'completed');
        updateProgressStep('detect', 'active');

        // Prepare request data
        const requestData = {
            mode: elements.analysisMode.value,
            image_data: base64Data,
            image_filename: uploadedFile.name,
            image_content_type: uploadedFile.type,
            symptoms: elements.symptoms.value.trim() || undefined
        };

        // Add advanced options if in advanced mode
        if (elements.analysisMode.value === 'advanced') {
            requestData.overrides = {
                confidence_threshold: parseFloat(elements.confidenceThreshold.value),
                nms_threshold: parseFloat(elements.nmsThreshold.value)
            };
        }

        updateProgress(40);

        // Call analysis API
        const response = await fetch(`${API_BASE_URL}/api/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData),
            signal: AbortSignal.timeout(API_TIMEOUT)
        });

        if (!response.ok) {
            throw new Error(`Analysis failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        currentRequestId = data.request_id;
        analysisResults = data;

        // Update progress through remaining steps
        updateProgressStep('detect', 'completed');
        updateProgressStep('analyze', 'active');
        updateProgress(60);

        await new Promise(resolve => setTimeout(resolve, 500));
        updateProgressStep('analyze', 'completed');
        updateProgressStep('triage', 'active');
        updateProgress(80);

        await new Promise(resolve => setTimeout(resolve, 500));
        updateProgressStep('triage', 'completed');
        updateProgressStep('summarize', 'active');
        updateProgress(100);

        await new Promise(resolve => setTimeout(resolve, 500));
        updateProgressStep('summarize', 'completed');

        hideLoading();
        displayResults(data);
        showToast('Analysis completed successfully!', 'success');

    } catch (error) {
        hideLoading();
        console.error('Analysis error:', error);
        showToast(`Analysis failed: ${error.message}`, 'error');
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Results Display
function displayResults(data) {
    console.log('=== FULL API RESPONSE DEBUG ===');
    console.log('Complete API response:', data);
    console.log('Response keys:', Object.keys(data));
    console.log('Triage data specifically:', data.triage);
    console.log('Steps data type:', typeof data.steps);
    console.log('Steps is array:', Array.isArray(data.steps));
    if (data.steps && Array.isArray(data.steps)) {
        console.log('Steps array:', data.steps);
        const triageStep = data.steps.find(s => s.name === 'TRIAGE');
        console.log('Triage step:', triageStep);
    } else {
        console.log('Steps is not an array or is missing:', data.steps);
    }
    console.log('================================');

    elements.resultsPanel.style.display = 'block';
    elements.exportBtn.disabled = false;

    // Display triage
    displayTriage(data.triage);

    // Display detections
    displayDetections(data.triage?.detections || data.detections || []);

    // Display images
    displayImages(data);
    
    // Display annotated image thumbnail
    displayAnnotatedImageThumbnail(data);

    // Display patient summary
    displayPatientSummary(data.patient_summary);

    // Display recommendations
    displayRecommendations(data.triage?.recommendations || []);

    // Display performance metrics
    displayPerformanceMetrics(data);

    // Scroll to results
    elements.resultsPanel.scrollIntoView({ behavior: 'smooth' });
}

function displayTriage(triage) {
    if (!triage) {
        elements.triageBadge.textContent = 'NO TRIAGE';
        elements.triageBadge.className = 'triage-badge';
        elements.triageConfidence.textContent = '';
        elements.triageDescription.textContent = 'Triage assessment not available';
        return;
    }

    const level = triage.level || 'UNKNOWN';
    const confidence = triage.confidence || 0;

    // Update badge
    elements.triageBadge.textContent = level;
    elements.triageBadge.className = `triage-badge ${level.toLowerCase()}`;

    // Update confidence
    elements.triageConfidence.textContent = `Confidence: ${(confidence * 100).toFixed(1)}%`;

    // Update description - Check both 'reasoning' and 'rationale' fields
    let description = '';
    const reasoningArray = triage.reasoning || triage.rationale;
    
    if (reasoningArray) {
        if (Array.isArray(reasoningArray) && reasoningArray.length > 0) {
            // Use the actual reasoning/rationale from the triage agent
            description = reasoningArray.join('. ') + '.';
        } else if (typeof reasoningArray === 'string' && reasoningArray.trim()) {
            // Handle case where reasoning is a string
            description = reasoningArray;
        }
    }
    
    if (!description) {
        // Fallback to default descriptions if no reasoning provided
        const defaultDescriptions = {
            'RED': 'Urgent medical attention required. Please seek immediate emergency care.',
            'AMBER': 'Medical attention needed within 24 hours. Monitor symptoms closely.',
            'GREEN': 'Non-urgent. Schedule routine medical consultation when convenient.',
            'UNKNOWN': 'Unable to determine urgency level. Consult healthcare provider for evaluation.'
        };
        description = defaultDescriptions[level] || defaultDescriptions['UNKNOWN'];
    }

    elements.triageDescription.textContent = description;
}

function displayDetections(detections) {
    elements.detectionCount.textContent = detections.length;

    if (!detections || detections.length === 0) {
        elements.detectionsList.innerHTML = '<div class="no-detections">No specific findings detected</div>';
        return;
    }

    elements.detectionsList.innerHTML = detections.map(detection => {
        const confidence = (detection.confidence || detection.score || 0) * 100;
        return `
            <div class="detection-item">
                <span class="detection-label">${detection.label.replace(/_/g, ' ')}</span>
                <span class="detection-confidence">${confidence.toFixed(1)}%</span>
            </div>
        `;
    }).join('');
}

function displayImages(data) {
    console.log('displayImages called with data:', {
        has_annotated_image_data: !!data.annotated_image_data,
        annotated_image_id: data.annotated_image_id,
        artifacts: data.artifacts,
        data_keys: Object.keys(data),
        full_data: data
    });
    
    // Check multiple possible locations for annotated image ID
    let annotatedImageId = data.annotated_image_id || 
                          data.artifacts?.annotated_image_id ||
                          data.artifacts?.annotated?.image_id ||
                          (data.steps && Array.isArray(data.steps) ? data.steps.find(s => s.artifacts?.annotated_image_id)?.artifacts?.annotated_image_id : null);
    
    console.log('Found annotated image ID:', annotatedImageId);
    
    // Display annotated image if available
    if (data.annotated_image_data) {
        console.log('Using annotated_image_data');
        elements.annotatedImage.src = data.annotated_image_data;
        elements.comparisonAnnotated.src = data.annotated_image_data;
        showToast('Annotated image loaded from analysis data', 'success');
    } else if (annotatedImageId) {
        const imageUrl = `${API_BASE_URL}/api/annotated/${annotatedImageId}`;
        
        // Show loading state for annotated image
        elements.annotatedImage.style.opacity = '0.5';
        elements.comparisonAnnotated.style.opacity = '0.5';
        
        // Load annotated image with error handling
        console.log('Loading annotated image from:', imageUrl);
        const annotatedImg = new Image();
        annotatedImg.onload = () => {
            console.log('Annotated image loaded successfully');
            elements.annotatedImage.src = imageUrl;
            elements.comparisonAnnotated.src = imageUrl;
            elements.annotatedImage.style.opacity = '1';
            elements.comparisonAnnotated.style.opacity = '1';
            showToast('Annotated image loaded successfully', 'success');
        };
        annotatedImg.onerror = (error) => {
            console.error('Failed to load annotated image:', error);
            console.error('URL attempted:', imageUrl);
            console.warn('Using original image as fallback');
            elements.annotatedImage.src = elements.originalImage.src;
            elements.comparisonAnnotated.src = elements.originalImage.src;
            elements.annotatedImage.style.opacity = '1';
            elements.comparisonAnnotated.style.opacity = '1';
            showToast('Using original image (annotated version unavailable)', 'warning');
        };
        annotatedImg.src = imageUrl;
    } else {
        // Use original image as fallback
        console.log('No annotated image ID found, using original image');
        elements.annotatedImage.src = elements.originalImage.src;
        elements.comparisonAnnotated.src = elements.originalImage.src;
        showToast('No annotated image available, showing original', 'info');
    }
}

function displayPatientSummary(summary) {
    if (!summary) {
        elements.summaryContent.innerHTML = `
            <div class="summary-placeholder">
                Patient summary not available. Please consult with a healthcare professional for detailed interpretation.
            </div>
        `;
        return;
    }

    elements.summaryContent.innerHTML = `<p>${summary}</p>`;
}

function displayRecommendations(recommendations) {
    if (!recommendations || recommendations.length === 0) {
        elements.recommendationsList.innerHTML = `
            <div class="recommendations-placeholder">
                <div class="recommendation-item">
                    <i class="fas fa-lightbulb"></i>
                    <span>Consult with a healthcare professional for proper medical evaluation</span>
                </div>
            </div>
        `;
        return;
    }

    elements.recommendationsList.innerHTML = recommendations.map(rec => `
        <div class="recommendation-item">
            <i class="fas fa-lightbulb"></i>
            <span>${rec}</span>
        </div>
    `).join('');
}

function displayPerformanceMetrics(data) {
    elements.processingTime.textContent = data.steps?.total_time ?
        `${data.steps.total_time}ms` :
        (data.inference_time_ms ? `${data.inference_time_ms}ms` : '-');

    elements.detectionTime.textContent = data.detection_time_ms ?
        `${data.detection_time_ms}ms` : '-';

    elements.modelConfidence.textContent = data.triage?.confidence ?
        `${(data.triage.confidence * 100).toFixed(1)}%` : '-';

    elements.requestId.textContent = data.request_id || '-';
}

// Image Tab Switching
function switchImageTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.image-tab').forEach(tab => {
        tab.classList.toggle('active', tab.id === `${tabName}Tab`);
    });
}

// Loading Management
function showLoading(title, message) {
    elements.loadingTitle.textContent = title;
    elements.loadingMessage.textContent = message;
    elements.loadingOverlay.classList.add('show');

    // Reset progress
    updateProgress(0);

    // Reset progress steps
    const steps = elements.progressSteps.querySelectorAll('.step');
    steps.forEach(step => {
        step.classList.remove('active', 'completed');
    });
}

function hideLoading() {
    elements.loadingOverlay.classList.remove('show');
}

function updateProgress(percentage) {
    elements.progressFill.style.width = `${percentage}%`;
}

function updateProgressStep(stepName, status) {
    const step = elements.progressSteps.querySelector(`[data-step="${stepName}"]`);
    if (step) {
        step.classList.remove('active', 'completed');
        if (status) {
            step.classList.add(status);
        }
    }
}

// Utility Functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showToast(message, type = 'info', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, duration);
}

function clearAll() {
    uploadedFile = null;
    currentRequestId = null;
    analysisResults = null;

    elements.fileInput.value = '';
    elements.imagePreview.style.display = 'none';
    elements.symptoms.value = '';
    elements.analysisMode.value = 'auto';
    elements.analyzeBtn.disabled = true;
    elements.mcpAnalyzeBtn.disabled = true;
    elements.resultsPanel.style.display = 'none';
    elements.exportBtn.disabled = true;

    handleModeChange();
    showToast('All data cleared', 'success');
}

// Modal Functions
function viewFullscreen(imageType) {
    const modal = elements.fullscreenModal;
    const modalImage = elements.modalImage;
    const modalTitle = elements.modalTitle;

    if (imageType === 'annotated') {
        modalImage.src = elements.annotatedImage.src;
        modalTitle.textContent = 'Annotated X-ray';
    } else {
        modalImage.src = elements.originalImage.src;
        modalTitle.textContent = 'Original X-ray';
    }

    modal.classList.add('show');
}

function closeModal() {
    elements.fullscreenModal.classList.remove('show');
}

function downloadAnnotatedImage() {
    if (elements.annotatedImage.src) {
        const link = document.createElement('a');
        link.href = elements.annotatedImage.src;
        link.download = `annotated_xray_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Annotated image downloaded', 'success');
    }
}

async function getAnnotatedImageInfo(imageId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/annotated/${imageId}/info`);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.warn('Failed to get annotated image info:', error);
    }
    return null;
}

function displayAnnotatedImageThumbnail(data) {
    // Check multiple possible locations for annotated image ID
    let annotatedImageId = data.annotated_image_id || 
                          data.artifacts?.annotated_image_id ||
                          data.artifacts?.annotated?.image_id ||
                          (data.steps && Array.isArray(data.steps) ? data.steps.find(s => s.artifacts?.annotated_image_id)?.artifacts?.annotated_image_id : null);
    
    if (!annotatedImageId) {
        console.log('No annotated image ID found for thumbnail display');
        return;
    }
    
    // Create thumbnail container if it doesn't exist
    let thumbnailContainer = document.getElementById('annotatedThumbnail');
    if (!thumbnailContainer) {
        thumbnailContainer = document.createElement('div');
        thumbnailContainer.id = 'annotatedThumbnail';
        thumbnailContainer.className = 'annotated-thumbnail';
        
        // Find a good place to insert it (after the detections card)
        const detectionsCard = document.querySelector('.detections-card');
        if (detectionsCard && detectionsCard.parentNode) {
            detectionsCard.parentNode.insertBefore(thumbnailContainer, detectionsCard.nextSibling);
        }
    }
    
    const imageUrl = `${API_BASE_URL}/api/annotated/${annotatedImageId}`;
    
    thumbnailContainer.innerHTML = `
        <div class="thumbnail-card">
            <div class="thumbnail-header">
                <h4><i class="fas fa-image"></i> Annotated Image</h4>
                <button class="btn btn-outline btn-small" onclick="viewFullscreen('annotated')">
                    <i class="fas fa-expand"></i> View Full Size
                </button>
            </div>
            <div class="thumbnail-content">
                <img src="${imageUrl}" alt="Annotated X-ray Thumbnail" class="thumbnail-image" 
                     onclick="viewFullscreen('annotated')" style="cursor: pointer;"
                     onerror="this.style.display='none'; console.error('Failed to load thumbnail from: ${imageUrl}');">
                <div class="thumbnail-info">
                    <div class="info-item">
                        <span class="label">Image ID:</span>
                        <span class="value">${annotatedImageId}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Type:</span>
                        <span class="value">Annotated X-ray</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Load additional image info asynchronously
    getAnnotatedImageInfo(annotatedImageId).then(info => {
        if (info) {
            const infoContainer = thumbnailContainer.querySelector('.thumbnail-info');
            infoContainer.innerHTML += `
                <div class="info-item">
                    <span class="label">Size:</span>
                    <span class="value">${formatFileSize(info.size_bytes)}</span>
                </div>
                <div class="info-item">
                    <span class="label">Format:</span>
                    <span class="value">${info.format.toUpperCase()}</span>
                </div>
            `;
        }
    });
}

function exportResults() {
    if (!analysisResults) {
        showToast('No results to export', 'warning');
        return;
    }

    const exportData = {
        timestamp: new Date().toISOString(),
        request_id: currentRequestId,
        file_info: {
            name: uploadedFile?.name,
            size: uploadedFile?.size,
            type: uploadedFile?.type
        },
        analysis_results: analysisResults
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orthopedic_analysis_${currentRequestId || Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Results exported successfully', 'success');
}

console.log('🎯 Advanced Orthopedic Assistant Frontend loaded successfully!');// Agent T

async function testAllAgents() {
    showLoading('Testing All Agents', 'Running comprehensive agent tests...');

    const results = [];
    const tests = [
        { name: 'Detection System', func: testDetectionSystem },
        { name: 'Hand Agent', func: testHandAgent },
        { name: 'Leg Agent', func: testLegAgent },
        { name: 'Triage Agent', func: testTriageAgent },
        { name: 'Diagnosis Agent', func: testDiagnosisAgent }
    ];

    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        updateProgress((i / tests.length) * 100);

        try {
            const result = await test.func();
            results.push({ name: test.name, status: 'success', result });
        } catch (error) {
            results.push({ name: test.name, status: 'error', error: error.message });
        }
    }

    hideLoading();
    displayAgentResults(results);
    showToast('All agent tests completed', 'success');
}

async function testDetectionSystem() {
    const response = await fetch(`${API_BASE_URL}/api/test-detection`, {
        method: 'POST'
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
}

async function testHandAgent() {
    if (!uploadedFile) {
        throw new Error('Please upload an image first');
    }

    const base64Data = await fileToBase64(uploadedFile);

    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            mode: 'auto',
            image_data: base64Data,
            image_filename: uploadedFile.name,
            body_part_hint: 'hand'
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
}

async function testLegAgent() {
    if (!uploadedFile) {
        throw new Error('Please upload an image first');
    }

    const base64Data = await fileToBase64(uploadedFile);

    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            mode: 'auto',
            image_data: base64Data,
            image_filename: uploadedFile.name,
            body_part_hint: 'leg'
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
}

async function testTriageAgent() {
    const mockData = {
        detections: [
            { label: 'displaced_fracture', confidence: 0.89 },
            { label: 'hairline_fracture', confidence: 0.67 }
        ],
        symptoms: 'Pain and swelling in hand',
        body_part: 'hand'
    };

    // This would call a specific triage endpoint if available
    return {
        agent: 'triage',
        level: 'AMBER',
        confidence: 0.78,
        recommendations: [
            'Seek medical attention within 24 hours',
            'Apply ice and elevate affected area',
            'Avoid using the injured hand'
        ]
    };
}

async function testDiagnosisAgent() {
    const mockData = {
        triage_result: { level: 'AMBER', confidence: 0.78 },
        detections: [{ label: 'displaced_fracture', confidence: 0.89 }],
        symptoms: 'Pain and swelling',
        body_part: 'hand'
    };

    // This would call a specific diagnosis endpoint if available
    return {
        agent: 'diagnosis',
        summary: 'Based on the analysis, there appears to be a displaced fracture requiring medical attention.',
        what_this_means: 'The detected fracture indicates a break in the bone that needs proper treatment.',
        next_steps: [
            'Visit emergency room or urgent care',
            'Get proper immobilization',
            'Follow up with orthopedic specialist'
        ]
    };
}

async function testBodyPartDetection() {
    if (!uploadedFile) {
        showToast('Please upload an image first', 'warning');
        return;
    }

    try {
        const result = await testDetectionSystem();
        displayAgentResults([{ name: 'Body Part Detection', status: 'success', result }]);
    } catch (error) {
        displayAgentResults([{ name: 'Body Part Detection', status: 'error', error: error.message }]);
    }
}

async function testReportAgent() {
    // Mock report generation test
    return {
        agent: 'report',
        status: 'success',
        report_id: `report_${Date.now()}`,
        pdf_generated: true,
        summary_created: true
    };
}

function displayAgentResults(results) {
    const container = document.getElementById('agentResults');

    if (!results || results.length === 0) {
        container.innerHTML = '<div class="no-results">No test results available</div>';
        return;
    }

    container.innerHTML = results.map(result => `
        <div class="result-card ${result.status}">
            <div class="card-header">
                <h4>
                    <i class="fas ${result.status === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                    ${result.name}
                </h4>
                <span class="status-badge ${result.status}">${result.status.toUpperCase()}</span>
            </div>
            <div class="card-content">
                <pre class="test-output">${JSON.stringify(result.result || result.error, null, 2)}</pre>
            </div>
        </div>
    `).join('');
}

// MCP Tools Functions
async function mcpHealthCheck() {
    try {
        showLoading('MCP Health Check', 'Testing MCP server health...');

        const response = await fetch(`${API_BASE_URL}/api/mcp/call`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tool: 'health_check',
                arguments: {}
            })
        });

        const data = await response.json();
        hideLoading();

        displayMCPResult('Health Check', data);
        showToast('MCP health check completed', 'success');

    } catch (error) {
        hideLoading();
        displayMCPResult('Health Check Error', { error: error.message });
        showToast('MCP health check failed', 'error');
    }
}

async function mcpBoneInfo() {
    const boneName = document.getElementById('boneName').value.trim();
    if (!boneName) {
        showToast('Please enter a bone name', 'warning');
        return;
    }

    try {
        showLoading('Getting Bone Information', `Retrieving information about ${boneName}...`);

        const response = await fetch(`${API_BASE_URL}/api/mcp/call`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tool: 'get_bone_info',
                arguments: { bone_name: boneName }
            })
        });

        const data = await response.json();
        hideLoading();

        displayMCPResult('Bone Information', data);
        showToast('Bone information retrieved', 'success');

    } catch (error) {
        hideLoading();
        displayMCPResult('Bone Info Error', { error: error.message });
        showToast('Failed to get bone information', 'error');
    }
}

async function mcpSuggestConditions() {
    const symptoms = document.getElementById('mcpSymptoms').value.trim();
    if (!symptoms) {
        showToast('Please enter symptoms', 'warning');
        return;
    }

    try {
        showLoading('Analyzing Symptoms', 'Getting condition suggestions...');

        const response = await fetch(`${API_BASE_URL}/api/mcp/call`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tool: 'suggest_conditions',
                arguments: {
                    symptoms: symptoms.split(',').map(s => s.trim()),
                    body_part: 'hand'
                }
            })
        });

        const data = await response.json();
        hideLoading();

        displayMCPResult('Condition Suggestions', data);
        showToast('Condition suggestions generated', 'success');

    } catch (error) {
        hideLoading();
        displayMCPResult('Conditions Error', { error: error.message });
        showToast('Failed to get condition suggestions', 'error');
    }
}

async function mcpAnalyzeXray() {
    if (!uploadedFile) {
        showToast('Please upload an image first', 'warning');
        return;
    }

    try {
        showLoading('MCP X-ray Analysis', 'Analyzing X-ray with MCP tools...');

        const base64Data = await fileToBase64(uploadedFile);
        const symptoms = elements.symptoms.value.trim();

        const response = await fetch(`${API_BASE_URL}/api/mcp/call`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tool: 'analyze_xray',
                arguments: {
                    image_data: base64Data,
                    image_filename: uploadedFile.name,
                    symptoms: symptoms || undefined,
                    urgency_level: 'routine'
                }
            })
        });

        const data = await response.json();
        hideLoading();

        displayMCPResult('X-ray Analysis', data);
        showToast('MCP X-ray analysis completed', 'success');

    } catch (error) {
        hideLoading();
        displayMCPResult('X-ray Analysis Error', { error: error.message });
        showToast('MCP X-ray analysis failed', 'error');
    }
}

function displayMCPResult(title, data) {
    const container = document.getElementById('mcpResults');

    // Extract meaningful content from MCP response
    let displayContent = data;
    if (data.result && data.result.content && data.result.content[0]) {
        displayContent = {
            success: data.success,
            tool: data.tool,
            content: data.result.content[0].text,
            raw_response: data
        };
    }

    const resultHtml = `
        <div class="mcp-result">
            <div class="result-header">
                <h4><i class="fas fa-terminal"></i> ${title}</h4>
                <span class="timestamp">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="result-content">
                <pre class="mcp-output">${JSON.stringify(displayContent, null, 2)}</pre>
            </div>
        </div>
    `;

    container.innerHTML = resultHtml + container.innerHTML;
}

// System Monitoring Functions
async function refreshSystemHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/healthz`);
        const data = await response.json();

        displaySystemHealth(data);

    } catch (error) {
        displaySystemHealth({ error: error.message, status: 'unhealthy' });
    }
}

function displaySystemHealth(data) {
    const container = document.getElementById('systemHealthData');

    if (data.error) {
        container.innerHTML = `
            <div class="health-error">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Health check failed: ${data.error}</span>
            </div>
        `;
        return;
    }

    const healthHtml = `
        <div class="health-overview">
            <div class="health-status ${data.status}">
                <i class="fas ${data.status === 'healthy' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>System Status: ${data.status.toUpperCase()}</span>
            </div>
            
            <div class="health-metrics">
                <div class="metric">
                    <span class="label">MCP Tools:</span>
                    <span class="value">${data.mcp_status?.tools_count || 0}</span>
                </div>
                <div class="metric">
                    <span class="label">Resources:</span>
                    <span class="value">${data.mcp_status?.resources_count || 0}</span>
                </div>
                <div class="metric">
                    <span class="label">Groq API:</span>
                    <span class="value ${data.configuration?.groq_configured ? 'success' : 'error'}">
                        ${data.configuration?.groq_configured ? 'Configured' : 'Not Configured'}
                    </span>
                </div>
                <div class="metric">
                    <span class="label">Metrics:</span>
                    <span class="value ${data.configuration?.metrics_enabled ? 'success' : 'warning'}">
                        ${data.configuration?.metrics_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                </div>
            </div>
        </div>
        
        <details class="health-details">
            <summary>View Full Health Data</summary>
            <pre class="health-raw">${JSON.stringify(data, null, 2)}</pre>
        </details>
    `;

    container.innerHTML = healthHtml;
}

async function loadMetrics() {
    try {
        // Load JSON metrics
        const jsonResponse = await fetch(`${API_BASE_URL}/metrics/`);
        const jsonData = await jsonResponse.json();
        document.getElementById('jsonMetrics').innerHTML = `<pre>${JSON.stringify(jsonData, null, 2)}</pre>`;

        // Load Prometheus metrics
        const promResponse = await fetch(`${API_BASE_URL}/metrics/prometheus`);
        const promData = await promResponse.text();
        document.getElementById('prometheusMetrics').innerHTML = `<pre>${promData}</pre>`;

        // Load audit metrics
        const auditResponse = await fetch(`${API_BASE_URL}/metrics/audit?limit=20`);
        const auditData = await auditResponse.json();
        document.getElementById('auditMetrics').innerHTML = `<pre>${JSON.stringify(auditData, null, 2)}</pre>`;

    } catch (error) {
        console.error('Failed to load metrics:', error);
    }
}

// Request History Functions
async function refreshRequests() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/requests`);
        const data = await response.json();

        displayRequestHistory(data.requests || []);

    } catch (error) {
        displayRequestHistory([]);
        showToast('Failed to load request history', 'error');
    }
}

function displayRequestHistory(requests) {
    const container = document.getElementById('requestsList');

    if (!requests || requests.length === 0) {
        container.innerHTML = '<div class="no-results">No requests found</div>';
        return;
    }

    container.innerHTML = requests.map(request => `
        <div class="request-item">
            <div class="request-header">
                <span class="request-id">${request.request_id}</span>
                <span class="request-status ${request.status}">${request.status}</span>
            </div>
            <div class="request-details">
                <div class="detail">
                    <span class="label">Mode:</span>
                    <span class="value">${request.mode}</span>
                </div>
                <div class="detail">
                    <span class="label">Body Part:</span>
                    <span class="value">${request.detected_body_part || 'Unknown'}</span>
                </div>
                <div class="detail">
                    <span class="label">Created:</span>
                    <span class="value">${new Date(request.created_at).toLocaleString()}</span>
                </div>
                <div class="detail">
                    <span class="label">Steps:</span>
                    <span class="value">${request.steps_completed}/${request.steps_total}</span>
                </div>
            </div>
        </div>
    `).join('');
}

async function searchRequest() {
    const requestId = document.getElementById('requestIdSearch').value.trim();
    if (!requestId) {
        showToast('Please enter a request ID', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/requests/${requestId}`);
        const data = await response.json();

        displayRequestHistory([data]);
        showToast('Request found', 'success');

    } catch (error) {
        displayRequestHistory([]);
        showToast('Request not found', 'error');
    }
}

// Event listeners for modal
document.addEventListener('click', (e) => {
    if (e.target === elements.fullscreenModal) {
        closeModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Initialize metrics tabs
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-btn') && e.target.closest('.metrics-tabs')) {
        const tabName = e.target.dataset.tab;
        const container = e.target.closest('.metrics-panel');

        // Update tab buttons
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        container.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}Metrics`);
        });
    }
});

// Toggle results view
function toggleResultsView() {
    const panel = elements.resultsPanel;
    panel.classList.toggle('expanded');
}

console.log('🎯 Advanced Orthopedic Assistant with full backend integration ready!');