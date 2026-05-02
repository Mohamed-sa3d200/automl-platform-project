/* ============================================
   AutoML Platform — Frontend Logic
   ============================================ */

(() => {
    "use strict";

    // ── Config ──
    const API_BASE = "http://127.0.0.1:8000";

    // ── DOM Refs ──
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const loadingOverlay = $("#loadingOverlay");
    const loadingText = $("#loadingText");
    const globalAlert = $("#globalAlert");

    const fileInput = $("#fileInput");
    const uploadZone = $("#uploadZone");
    const fileSelectedName = $("#fileSelectedName");

    const previewCard = $("#previewCard");
    const dataInfoGrid = $("#dataInfoGrid");
    const columnsList = $("#columnsList");
    const previewTableWrapper = $("#previewTableWrapper");

    const taskCard = $("#taskCard");
    const taskRadios = $$('input[name="taskType"]');
    const targetRow = $("#targetRow");
    const targetSelect = $("#targetSelect");

    const trainCard = $("#trainCard");
    const trainBtn = $("#trainBtn");

    const resultsCard = $("#resultsCard");
    const resultsHeader = $("#resultsHeader");
    const metricCards = $("#metricCards");
    const modelComparisonWrapper = $("#modelComparisonWrapper");
    const confusionMatrixSection = $("#confusionMatrixSection");
    const downloadBtn = $("#downloadBtn");

    // ── State ──
    let uploadedColumns = [];
    let selectedTask = null;

    // ── Helpers ──

    /** Show / hide global loading overlay */
    function showLoading(message) {
        loadingText.textContent = message;
        loadingOverlay.classList.add("active");
    }

    function hideLoading() {
        loadingOverlay.classList.remove("active");
    }

    /** Show a global alert banner */
    function showAlert(type, message) {
        const icons = { error: "⚠️", success: "✅", warning: "⚡", info: "ℹ️" };
        globalAlert.className = `alert alert-${type}`;
        globalAlert.innerHTML = `<span>${icons[type] || ""}</span><span>${escapeHtml(message)}</span>`;
        globalAlert.classList.remove("hidden");
        globalAlert.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function hideAlert() {
        globalAlert.classList.add("hidden");
    }

    /** Escape HTML to prevent XSS */
    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    /** Format a number to 4 decimal places */
    function fmt(val) {
        if (typeof val !== "number") return val;
        return val.toFixed(4);
    }

    /** Reveal a card with animation */
    function reveal(el) {
        el.classList.remove("hidden");
        el.style.animation = "none";
        // force reflow
        void el.offsetWidth;
        el.style.animation = "fadeSlideUp 0.5s ease forwards";
    }

    // ── Drag & Drop visuals ──
    uploadZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadZone.classList.add("drag-over");
    });
    uploadZone.addEventListener("dragleave", () => {
        uploadZone.classList.remove("drag-over");
    });
    uploadZone.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadZone.classList.remove("drag-over");
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelected();
        }
    });

    // ── Mouse glow effect ──
    document.addEventListener("mousemove", (e) => {
        document.body.style.setProperty("--mouse-x", e.clientX + "px");
        document.body.style.setProperty("--mouse-y", e.clientY + "px");
    });

    // ══════════════════════════════════════════
    //  1. FILE UPLOAD
    // ══════════════════════════════════════════

    fileInput.addEventListener("change", handleFileSelected);

    async function handleFileSelected() {
        const file = fileInput.files[0];
        if (!file) return;

        // Validate extension
        const ext = file.name.split(".").pop().toLowerCase();
        if (!["csv", "xlsx"].includes(ext)) {
            showAlert("error", "Invalid file type. Please upload a .csv or .xlsx file.");
            fileInput.value = "";
            return;
        }

        // Show file name
        fileSelectedName.innerHTML = `📎 ${escapeHtml(file.name)}`;
        fileSelectedName.classList.remove("hidden");

        hideAlert();

        // Upload to backend
        const formData = new FormData();
        formData.append("file", file);

        showLoading("Uploading dataset…");

        // Add a 60-second timeout so it doesn't spin forever
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
            const res = await fetch(`${API_BASE}/upload`, {
                method: "POST",
                body: formData,
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || "Upload failed.");
            }

            // Success — render preview
            renderPreview(data);
        } catch (err) {
            showAlert("error", err.message || "Failed to upload file. Is the backend running?");
        } finally {
            hideLoading();
        }
    }

    // ══════════════════════════════════════════
    //  2. DATA PREVIEW
    // ══════════════════════════════════════════

    function renderPreview(data) {
        // Info grid
        dataInfoGrid.innerHTML = `
      <div class="info-item">
        <div class="info-item__label">File</div>
        <div class="info-item__value" title="${escapeHtml(data.filename)}">${escapeHtml(data.filename)}</div>
      </div>
      <div class="info-item">
        <div class="info-item__label">Rows</div>
        <div class="info-item__value">${data.shape.rows.toLocaleString()}</div>
      </div>
      <div class="info-item">
        <div class="info-item__label">Columns</div>
        <div class="info-item__value">${data.shape.columns}</div>
      </div>
    `;

        // Column chips
        uploadedColumns = data.columns;
        columnsList.innerHTML = data.columns
            .map((c) => `<span class="column-chip">${escapeHtml(c)}</span>`)
            .join("");

        // Preview table (first 5 rows)
        if (data.preview && data.preview.length) {
            const cols = data.columns;
            let thead = cols.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
            let tbody = data.preview
                .map(
                    (row) =>
                        "<tr>" +
                        cols.map((c) => `<td>${escapeHtml(String(row[c] ?? ""))}</td>`).join("") +
                        "</tr>"
                )
                .join("");

            previewTableWrapper.innerHTML = `
        <table class="data-table">
          <thead><tr>${thead}</tr></thead>
          <tbody>${tbody}</tbody>
        </table>
      `;
        }

        // Show cards
        reveal(previewCard);
        reveal(taskCard);
        reveal(trainCard);

        // Reset downstream
        resultsCard.classList.add("hidden");
        selectedTask = null;
        taskRadios.forEach((r) => (r.checked = false));
        targetRow.classList.add("hidden");
        trainBtn.disabled = true;

        previewCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // ══════════════════════════════════════════
    //  3 & 4. TASK + TARGET SELECTION
    // ══════════════════════════════════════════

    taskRadios.forEach((radio) => {
        radio.addEventListener("change", () => {
            selectedTask = radio.value;

            if (selectedTask === "clustering") {
                targetRow.classList.add("hidden");
                targetSelect.value = "";
                trainBtn.disabled = false;
            } else {
                // Show target dropdown
                populateTargetDropdown();
                reveal(targetRow);
                trainBtn.disabled = !targetSelect.value;
            }

            // Reset results
            resultsCard.classList.add("hidden");
        });
    });

    targetSelect.addEventListener("change", () => {
        if (selectedTask && selectedTask !== "clustering") {
            trainBtn.disabled = !targetSelect.value;
        }
    });

    function populateTargetDropdown() {
        targetSelect.innerHTML =
            '<option value="">— select target column —</option>' +
            uploadedColumns
                .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
                .join("");
    }

    // ══════════════════════════════════════════
    //  5. START TRAINING
    // ══════════════════════════════════════════

    trainBtn.addEventListener("click", handleTrain);

    async function handleTrain() {
        hideAlert();

        // Validations
        if (!fileInput.files.length) {
            showAlert("error", "Please upload a dataset first.");
            return;
        }

        if (!selectedTask) {
            showAlert("error", "Please select a task type.");
            return;
        }

        if (selectedTask !== "clustering" && !targetSelect.value) {
            showAlert("error", "Please select a target column for " + selectedTask + ".");
            return;
        }

        const formData = new FormData();
        formData.append("task_type", selectedTask);
        if (selectedTask !== "clustering") {
            formData.append("target_column", targetSelect.value);
        }

        showLoading("Training model, please wait…");

        try {
            const res = await fetch(`${API_BASE}/train`, {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || "Training failed.");
            }

            renderResults(data);
        } catch (err) {
            showAlert("error", err.message || "Training failed. Please try again.");
        } finally {
            hideLoading();
        }
    }

    // ══════════════════════════════════════════
    //  6–9. RESULTS REPORT
    // ══════════════════════════════════════════

    function renderResults(data) {
        const taskType = data.task_type;

        // ── Header ──
        let headerHtml = `
      <div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.25rem;">Task: <strong style="color:var(--text-secondary)">${capitalize(taskType)}</strong></div>
        ${data.target_column ? `<div style="font-size:0.8rem;color:var(--text-muted);">Target: <strong style="color:var(--text-secondary)">${escapeHtml(data.target_column)}</strong></div>` : ""}
      </div>
      <div class="best-model-badge">🏆 Best: ${escapeHtml(data.best_model)} — ${fmt(data.best_score)}</div>
    `;
        resultsHeader.innerHTML = headerHtml;

        // ── Key Metrics (best model) ──
        const bestMetrics = data.metrics[data.best_model];
        metricCards.innerHTML = "";

        if (taskType === "classification") {
            renderMetricCard("Accuracy", bestMetrics.accuracy);
            renderMetricCard("Precision", bestMetrics.precision);
            renderMetricCard("Recall", bestMetrics.recall);
            renderMetricCard("F1-Score", bestMetrics.f1_score);
        } else if (taskType === "regression") {
            renderMetricCard("MAE", bestMetrics.mae);
            renderMetricCard("MSE", bestMetrics.mse);
            renderMetricCard("R² Score", bestMetrics.r2_score);
        } else if (taskType === "clustering") {
            renderMetricCard("Optimal Clusters", bestMetrics.optimal_clusters);
            renderMetricCard("Silhouette Score", bestMetrics.silhouette_score);
        }

        // ── Model comparison table ──
        renderModelTable(data, taskType);

        // ── Confusion matrix (classification only) ──
        if (taskType === "classification" && bestMetrics.confusion_matrix) {
            renderConfusionMatrix(bestMetrics.confusion_matrix);
            confusionMatrixSection.classList.remove("hidden");
        } else {
            confusionMatrixSection.classList.add("hidden");
        }

        // ── Download button ──
        downloadBtn.href = `${API_BASE}/download-model`;

        reveal(resultsCard);
        resultsCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function renderMetricCard(label, value) {
        metricCards.innerHTML += `
      <div class="metric-card">
        <div class="metric-card__label">${label}</div>
        <div class="metric-card__value">${fmt(value)}</div>
      </div>
    `;
    }

    function renderModelTable(data, taskType) {
        const models = Object.keys(data.metrics);
        let headerCols = [];
        let metricKeys = [];

        if (taskType === "classification") {
            headerCols = ["Model", "Accuracy", "Precision", "Recall", "F1-Score"];
            metricKeys = ["accuracy", "precision", "recall", "f1_score"];
        } else if (taskType === "regression") {
            headerCols = ["Model", "MAE", "MSE", "R² Score"];
            metricKeys = ["mae", "mse", "r2_score"];
        } else {
            headerCols = ["Model", "Optimal Clusters", "Silhouette Score"];
            metricKeys = ["optimal_clusters", "silhouette_score"];
        }

        let thead = headerCols.map((h) => `<th>${h}</th>`).join("");
        let tbody = models
            .map((name) => {
                const isBest = name === data.best_model;
                const m = data.metrics[name];
                const cells = metricKeys.map((k) => `<td>${fmt(m[k])}</td>`).join("");
                return `<tr class="${isBest ? "best-row" : ""}"><td>${escapeHtml(name)}${isBest ? " 🏆" : ""}</td>${cells}</tr>`;
            })
            .join("");

        modelComparisonWrapper.innerHTML = `
      <table class="model-table">
        <thead><tr>${thead}</tr></thead>
        <tbody>${tbody}</tbody>
      </table>
    `;
    }

    function renderConfusionMatrix(matrix) {
        const size = matrix.length;
        let labels = [];
        for (let i = 0; i < size; i++) labels.push(`Class ${i}`);

        let thead = "<th></th>" + labels.map((l) => `<th>${l}</th>`).join("");
        let tbody = matrix
            .map(
                (row, i) =>
                    `<tr><th>${labels[i]}</th>${row.map((v) => `<td>${v}</td>`).join("")}</tr>`
            )
            .join("");

        confusionMatrixSection.innerHTML = `
      <h4>Confusion Matrix (Best Model)</h4>
      <div class="table-wrapper">
        <table class="confusion-table">
          <thead><tr>${thead}</tr></thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
    `;
    }

    function capitalize(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
})();
