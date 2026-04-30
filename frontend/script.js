console.log("FRONTEND SCRIPT LOADED - STABLE VERSION");

// API Configuration
const API_BASE_URL = 'http://127.0.0.1:8000';

// Global variables
let currentFile = null;
let uploadedSuccessfully = false;
let currentTask = null;

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const fileInfo = document.getElementById('fileInfo');
const previewContainer = document.getElementById('previewContainer');
const previewTable = document.getElementById('previewTable');
const taskSelect = document.getElementById('taskSelect');
const targetSelector = document.getElementById('targetSelector');
const targetSelect = document.getElementById('targetSelect');
const trainBtn = document.getElementById('trainBtn');
const loading = document.getElementById('loading');
const resultsContainer = document.getElementById('resultsContainer');
const resultsDiv = document.getElementById('results');
const saveModelBtn = document.getElementById('saveModelBtn');
const alertDiv = document.getElementById('alert');

// Helper: Show alert message
function showAlert(message, type = 'error') {
    alertDiv.textContent = message;
    alertDiv.className = `alert alert-${type} active`;

    setTimeout(() => {
        alertDiv.classList.remove('active');
    }, 5000);
}

// Reset UI when a new file is selected
function resetForNewFile() {
    uploadedSuccessfully = false;

    previewContainer.classList.remove('active');
    previewTable.innerHTML = '';

    targetSelect.innerHTML = '<option value="">-- Select Target --</option>';
    targetSelector.classList.remove('active');
    taskSelect.value = '';

    resultsContainer.classList.remove('active');
    resultsDiv.innerHTML = '';

    updateTrainButton();
}

// Helper: Update train button state
function updateTrainButton() {
    const hasUploadedFile = uploadedSuccessfully === true;
    const hasTask = taskSelect.value !== '';

    const needsTarget =
        taskSelect.value === 'classification' ||
        taskSelect.value === 'regression';

    const hasTarget = !needsTarget || targetSelect.value !== '';

    trainBtn.disabled = !(hasUploadedFile && hasTask && hasTarget);
}

// Validate selected file
function validateFile(file) {
    if (!file) {
        showAlert('Please choose a file first.');
        return false;
    }

    const fileName = file.name.toLowerCase();

    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx')) {
        showAlert('Only CSV and Excel files are supported.');
        return false;
    }

    return true;
}

// Upload file to backend
async function uploadFile(file) {
    console.log("START UPLOAD:", file ? file.name : "No file");

    if (!validateFile(file)) {
        return false;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';

        showAlert('Uploading file...', 'success');

        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        console.log("UPLOAD RESPONSE:", data);

        if (!response.ok) {
            throw new Error(data.detail || 'Upload failed');
        }

        uploadedSuccessfully = true;

        fileInfo.innerHTML = `
            <strong>✅ File uploaded successfully!</strong><br>
            Filename: ${data.filename}<br>
            Size: ${(file.size / 1024).toFixed(2)} KB<br>
            Rows: ${data.shape.rows}, Columns: ${data.shape.columns}
        `;
        fileInfo.classList.add('active');

        displayPreview(data.preview);
        updateTargetSelector(data.columns);

        showAlert('File uploaded successfully!', 'success');
        updateTrainButton();

        return true;

    } catch (error) {
        console.error('Upload error:', error);

        uploadedSuccessfully = false;
        updateTrainButton();

        showAlert(`Error uploading file: ${error.message}`);
        return false;

    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload File';
    }
}

// Display data preview
function displayPreview(previewData) {
    if (!previewData || previewData.length === 0) {
        previewContainer.classList.remove('active');
        return;
    }

    const columns = Object.keys(previewData[0]);

    let html = '<table class="preview-table"><thead><tr>';

    columns.forEach(col => {
        html += `<th>${col}</th>`;
    });

    html += '</tr></thead><tbody>';

    previewData.forEach(row => {
        html += '<tr>';

        columns.forEach(col => {
            const value =
                row[col] !== null && row[col] !== undefined
                    ? row[col]
                    : '';

            html += `<td>${value}</td>`;
        });

        html += '</tr>';
    });

    html += '</tbody></table>';

    previewTable.innerHTML = html;
    previewContainer.classList.add('active');
}

// Update target selector dropdown
function updateTargetSelector(columns) {
    console.log("COLUMNS RECEIVED:", columns);

    targetSelect.innerHTML = '<option value="">-- Select Target --</option>';

    if (!columns || columns.length === 0) {
        return;
    }

    columns.forEach(col => {
        const option = document.createElement('option');
        option.value = col;
        option.textContent = col;
        targetSelect.appendChild(option);
    });

    console.log("TARGET OPTIONS COUNT:", targetSelect.options.length);
}

// Train model
async function trainModel() {
    const task = taskSelect.value;

    const target =
        task === 'classification' || task === 'regression'
            ? targetSelect.value
            : '';

    const formData = new FormData();
    formData.append('task_type', task);

    if (target) {
        formData.append('target_column', target);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/train`, {
            method: 'POST',
            body: formData
        });

        const results = await response.json();

        console.log("TRAIN RESPONSE:", results);

        if (!response.ok) {
            throw new Error(results.detail || 'Training failed');
        }

        displayResults(results);
        showAlert('Model training completed successfully!', 'success');

        return results;

    } catch (error) {
        console.error('Training error:', error);
        showAlert(`Error training model: ${error.message}`);
        throw error;
    }
}

// Format numbers
function formatValue(value) {
    if (typeof value !== 'number') {
        return value;
    }

    return Number(value).toFixed(4);
}

// Display metric names nicely
function formatMetricName(metricName) {
    const names = {
        accuracy: 'Accuracy',
        precision: 'Precision',
        recall: 'Recall',
        f1_score: 'F1-Score',
        mae: 'MAE',
        mse: 'MSE',
        r2_score: 'R² Score',
        silhouette_score: 'Silhouette Score'
    };

    return names[metricName] || metricName;
}

// Display confusion matrix
function renderConfusionMatrix(matrix) {
    if (!matrix || matrix.length === 0) {
        return '';
    }

    let html = `
        <div class="confusion-matrix">
            <h4>Confusion Matrix</h4>
            <table>
    `;

    matrix.forEach(row => {
        html += '<tr>';

        row.forEach(value => {
            html += `<td>${value}</td>`;
        });

        html += '</tr>';
    });

    html += `
            </table>
        </div>
    `;

    return html;
}

// Display training results
function displayResults(results) {
    let html = '';

    html += `
        <div class="best-model-card">
            <h4>🏆 Best Model</h4>
            <div class="value">${results.best_model}</div>
            <p>Best Score: ${formatValue(results.best_score)}</p>
            <p>Task Type: ${results.task_type}</p>
            ${
                results.target_column
                    ? `<p>Target Column: ${results.target_column}</p>`
                    : ''
            }
        </div>
    `;

    html += '<div class="metrics-grid">';

    Object.entries(results.metrics).forEach(([modelName, metrics]) => {
        html += `
            <div class="metric-card">
                <h4>${modelName}</h4>
        `;

        Object.entries(metrics).forEach(([metricName, metricValue]) => {
            if (metricName === 'confusion_matrix') {
                return;
            }

            html += `
                <p>
                    <strong>${formatMetricName(metricName)}:</strong>
                    ${formatValue(metricValue)}
                </p>
            `;
        });

        if (metrics.confusion_matrix) {
            html += renderConfusionMatrix(metrics.confusion_matrix);
        }

        html += '</div>';
    });

    html += '</div>';

    resultsDiv.innerHTML = html;
    resultsContainer.classList.add('active');
}

// Download trained model
async function downloadModel() {
    try {
        const response = await fetch(`${API_BASE_URL}/download-model`);

        if (!response.ok) {
            throw new Error('Download failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'best_model.joblib';

        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(url);
        a.remove();

        showAlert('Model downloaded successfully!', 'success');

    } catch (error) {
        console.error('Download error:', error);
        showAlert('Error downloading model. Please train a model first.');
    }
}

// -----------------------------
// Event Listeners
// -----------------------------

fileInput.addEventListener('click', (e) => {
    e.stopPropagation();
});

fileInput.addEventListener('change', () => {
    console.log("FILE CHANGED");

    if (fileInput.files.length > 0) {
        currentFile = fileInput.files[0];

        resetForNewFile();

        fileInfo.innerHTML = `
            <strong>Selected file:</strong> ${currentFile.name}<br>
            <strong>Size:</strong> ${(currentFile.size / 1024).toFixed(2)} KB<br>
            <span>Now click Upload File.</span>
        `;
        fileInfo.classList.add('active');

        updateTrainButton();
    }
});

uploadBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log("UPLOAD BUTTON CLICKED");

    if (!currentFile) {
        showAlert('Please choose a file first.');
        return;
    }

    await uploadFile(currentFile);
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', async (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');

    const files = e.dataTransfer.files;

    if (files.length > 0) {
        currentFile = files[0];

        resetForNewFile();

        fileInfo.innerHTML = `
            <strong>Selected file:</strong> ${currentFile.name}<br>
            <strong>Size:</strong> ${(currentFile.size / 1024).toFixed(2)} KB<br>
            <span>Uploading...</span>
        `;
        fileInfo.classList.add('active');

        await uploadFile(currentFile);
    }
});

taskSelect.addEventListener('change', () => {
    currentTask = taskSelect.value;

    if (currentTask === 'classification' || currentTask === 'regression') {
        targetSelector.classList.add('active');
    } else {
        targetSelector.classList.remove('active');
        targetSelect.value = '';
    }

    updateTrainButton();
});

targetSelect.addEventListener('change', updateTrainButton);

trainBtn.addEventListener('click', async () => {
    resultsContainer.classList.remove('active');

    loading.classList.add('active');
    trainBtn.disabled = true;

    try {
        await trainModel();
    } catch (error) {
        console.error('Training failed:', error);
    } finally {
        loading.classList.remove('active');
        updateTrainButton();
    }
});

saveModelBtn.addEventListener('click', downloadModel);

// Disable train button initially
trainBtn.disabled = true;