// API Configuration
const API_BASE_URL = 'http://localhost:8000'; // Change to your backend URL

// Global variables
let currentFile = null;
let currentDataPreview = null;
let currentTask = null;
let sessionId = null;

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
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

// Helper: Update train button state
function updateTrainButton() {
    const hasFile = currentFile !== null;
    const hasTask = taskSelect.value !== '';
    const hasTarget = !['classification', 'regression'].includes(taskSelect.value) || targetSelect.value !== '';
    
    trainBtn.disabled = !(hasFile && hasTask && hasTarget);
}

// Upload file to backend
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const data = await response.json();
        sessionId = data.session_id;
        currentDataPreview = data.preview;
        
        // Display file info
        fileInfo.innerHTML = `
            <strong>✅ File uploaded successfully!</strong><br>
            Filename: ${file.name}<br>
            Size: ${(file.size / 1024).toFixed(2)} KB<br>
            Rows: ${data.rows}, Columns: ${data.columns}
        `;
        fileInfo.classList.add('active');
        
        // Display data preview
        displayPreview(data.preview);
        
        // Update target selector with column names
        updateTargetSelector(data.columns);
        
        showAlert('File uploaded successfully!', 'success');
        return true;
    } catch (error) {
        console.error('Upload error:', error);
        showAlert('Error uploading file. Please try again.');
        return false;
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
            html += `<td>${row[col] !== null && row[col] !== undefined ? row[col] : 'null'}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    
    previewTable.innerHTML = html;
    previewContainer.classList.add('active');
}

// Update target selector dropdown
function updateTargetSelector(columns) {
    targetSelect.innerHTML = '<option value="">-- Select Target --</option>';
    columns.forEach(col => {
        targetSelect.innerHTML += `<option value="${col}">${col}</option>`;
    });
}

// Train model
async function trainModel() {
    const task = taskSelect.value;
    const target = (task === 'classification' || task === 'regression') ? targetSelect.value : null;
    
    const requestBody = {
        session_id: sessionId,
        task: task,
        target_column: target
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/train`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Training failed');
        }
        
        const results = await response.json();
        displayResults(results);
        showAlert('Model training completed successfully!', 'success');
        return results;
    } catch (error) {
        console.error('Training error:', error);
        showAlert(`Error training model: ${error.message}`);
        throw error;
    }
}

// Display results
function displayResults(results) {
    let html = '<div class="metrics-grid">';
    
    if (results.metrics) {
        if (results.task === 'classification') {
            // Classification metrics
            const metrics = results.metrics;
            html += `
                <div class="metric-card">
                    <h4>Accuracy</h4>
                    <div class="value">${(metrics.accuracy * 100).toFixed(2)}%</div>
                </div>
                <div class="metric-card">
                    <h4>Precision</h4>
                    <div class="value">${(metrics.precision * 100).toFixed(2)}%</div>
                </div>
                <div class="metric-card">
                    <h4>Recall</h4>
                    <div class="value">${(metrics.recall * 100).toFixed(2)}%</div>
                </div>
                <div class="metric-card">
                    <h4>F1-Score</h4>
                    <div class="value">${(metrics.f1 * 100).toFixed(2)}%</div>
                </div>
            `;
            
            // Confusion Matrix
            if (results.confusion_matrix) {
                html += `<div class="confusion-matrix"><h4>Confusion Matrix</h4><table>`;
                const cm = results.confusion_matrix;
                html += '<tr><th></th><th>Predicted Negative</th><th>Predicted Positive</th></tr>';
                html += `<tr><th>Actual Negative</th><td>${cm[0][0]}</td><td>${cm[0][1]}</td></tr>`;
                html += `<tr><th>Actual Positive</th><td>${cm[1][0]}</td><td>${cm[1][1]}</td></tr>`;
                html += `</table></div>`;
            }
            
        } else if (results.task === 'regression') {
            // Regression metrics
            const metrics = results.metrics;
            html += `
                <div class="metric-card">
                    <h4>Mean Absolute Error (MAE)</h4>
                    <div class="value">${metrics.mae.toFixed(4)}</div>
                </div>
                <div class="metric-card">
                    <h4>Mean Squared Error (MSE)</h4>
                    <div class="value">${metrics.mse.toFixed(4)}</div>
                </div>
                <div class="metric-card">
                    <h4>R² Score</h4>
                    <div class="value">${(metrics.r2 * 100).toFixed(2)}%</div>
                </div>
            `;
            
        } else if (results.task === 'clustering') {
            // Clustering metrics
            html += `
                <div class="metric-card">
                    <h4>Silhouette Score</h4>
                    <div class="value">${results.metrics.silhouette_score.toFixed(4)}</div>
                </div>
            `;
        }
    }
    
    html += '</div>';
    
    if (results.best_model) {
        html += `<div class="metric-card" style="background: #28a745; margin-top: 10px;">
                    <h4>🏆 Best Model</h4>
                    <div class="value">${results.best_model}</div>
                </div>`;
    }
    
    resultsDiv.innerHTML = html;
    resultsContainer.classList.add('active');
}

// Download model
async function downloadModel() {
    try {
        const response = await fetch(`${API_BASE_URL}/download_model?session_id=${sessionId}`);
        
        if (!response.ok) {
            throw new Error('Download failed');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `model_${sessionId}.pkl`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        showAlert('Model downloaded successfully!', 'success');
    } catch (error) {
        console.error('Download error:', error);
        showAlert('Error downloading model');
    }
}

// Event Listeners
uploadArea.addEventListener('click', () => {
    fileInput.click();
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
        await uploadFile(currentFile);
        updateTrainButton();
    }
});

fileInput.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
        currentFile = e.target.files[0];
        await uploadFile(currentFile);
        updateTrainButton();
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
    // Hide any previous results
    resultsContainer.classList.remove('active');
    
    // Show loading
    loading.classList.add('active');
    trainBtn.disabled = true;
    
    try {
        await trainModel();
    } catch (error) {
        console.error('Training failed:', error);
    } finally {
        loading.classList.remove('active');
        trainBtn.disabled = false;
        updateTrainButton();
    }
});

saveModelBtn.addEventListener('click', downloadModel);

// Disable train button initially
trainBtn.disabled = true;
