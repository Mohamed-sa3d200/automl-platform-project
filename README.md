# AutoML Platform Project

## Project Overview

AutoML Platform is an end-to-end Automated Machine Learning web application.

The goal of the project is to allow non-technical users to upload a dataset, choose a machine learning task, train multiple models automatically, evaluate them, select the best model, and download the trained model without writing code.

The application supports:

- Classification
- Regression
- Clustering

The project consists of:

- Frontend UI using HTML, CSS, and JavaScript
- Backend API using FastAPI
- Machine Learning pipeline using scikit-learn
- Model saving using joblib

---

## Main Features

### 1. Dataset Upload

The user can upload a dataset in:

- `.csv`
- `.xlsx`

After uploading, the application displays:

- Filename
- Number of rows
- Number of columns
- Preview of the first few rows

---

### 2. Task Selection

The user can select the machine learning task type:

- Classification
- Regression
- Clustering

For Classification and Regression, the user must select a target column.

For Clustering, no target column is required.

---

### 3. Automated Data Preprocessing

The backend automatically performs preprocessing steps:

- Handle missing values
  - Numerical columns: mean imputation
  - Categorical columns: most frequent imputation
- Encode categorical variables using `OneHotEncoder`
- Scale numerical features using `StandardScaler`
- Handle imbalanced classification targets using `SMOTE` when needed
- Remove duplicate rows
- Remove empty columns
- Handle datetime-like columns

---

### 4. Model Training

The backend trains at least two models for each task type.

#### Classification

- Logistic Regression
- Random Forest Classifier

#### Regression

- Linear Regression
- Random Forest Regressor

#### Clustering

- KMeans
- Agglomerative Clustering

For Classification and Regression, the data is split into training and testing sets using an 80/20 split.

---

### 5. Model Evaluation

The application evaluates models using metrics based on the selected task.

#### Classification Metrics

- Accuracy
- Precision
- Recall
- F1-Score
- Confusion Matrix

#### Regression Metrics

- Mean Absolute Error
- Mean Squared Error
- R2 Score

#### Clustering Metrics

- Silhouette Score

The best model is selected automatically based on:

- Classification: F1-Score
- Regression: R2 Score
- Clustering: Silhouette Score

---

### 6. Results and Model Export

After training, the frontend displays:

- Best model
- Best score
- Metrics for all trained models
- Confusion matrix for classification tasks

The user can download the trained model as:

```text
best_model.joblib
```

The saved model includes:

- Preprocessing pipeline
- Trained model

---

## Project Structure

```text
automl-platform-project/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── backend/
│   ├── __init__.py
│   ├── main.py
│   ├── preprocessing.py
│   ├── models.py
│   ├── automl.py
│   ├── evaluation.py
│   │
│   ├── uploads/
│   │   └── uploaded datasets are stored here locally
│   │
│   └── saved_models/
│       └── best_model.joblib is saved here locally
│
├── .gitignore
├── requirements.txt
├── README.md
└── Project Workflow.png
```

> Note: `backend/uploads/`, `backend/saved_models/`, `*.joblib`, and `*.pkl` are ignored by Git and should not be uploaded to GitHub.

---

## Technologies Used

### Frontend

- HTML
- CSS
- JavaScript
- Fetch API

### Backend

- Python
- FastAPI
- Uvicorn

### Machine Learning

- pandas
- numpy
- scikit-learn
- imbalanced-learn
- joblib
- openpyxl

---

## API Endpoints

### 1. Home Endpoint

```http
GET /
```

Returns a message confirming that the API is running.

---

### 2. Upload Dataset

```http
POST /upload
```

Used to upload a dataset.

Supported formats:

- CSV
- Excel

Returns:

- Filename
- Shape
- Column names
- Preview of first rows

---

### 3. Train Model

```http
POST /train
```

Used to train models based on the selected task.

Form data:

```text
task_type
target_column
```

`target_column` is required for:

- Classification
- Regression

`target_column` is not required for:

- Clustering

Returns:

- Best model
- Best score
- Metrics for all models
- Model download URL

---

### 4. Download Model

```http
GET /download-model
```

Downloads the trained model as:

```text
best_model.joblib
```

---

## How to Run the Project

### 1. Clone the Repository

```bash
git clone https://github.com/Mohamed-sa3d200/automl-platform-project.git
cd automl-platform-project
```

---

### 2. Create Virtual Environment

```bash
python -m venv venv
```

---

### 3. Activate Virtual Environment

On Windows:

```bash
venv\Scripts\activate
```

---

### 4. Install Requirements

```bash
pip install -r requirements.txt
```

---

### 5. Run Backend Server

```bash
python -m uvicorn backend.main:app --reload
```

The backend will run on:

```text
http://127.0.0.1:8000
```

FastAPI documentation:

```text
http://127.0.0.1:8000/docs
```

---

### 6. Run Frontend

Open a second terminal in the project folder and run:

```bash
python -m http.server 5600
```

Then open:

```text
http://127.0.0.1:5600/frontend/index.html
```

Important:

The backend must be running on port `8000` while using the frontend.

---

## Testing Datasets

The project was tested using datasets for the three ML task types.

### Classification

Dataset:

```text
Telecom Churn Dataset
```

Task:

```text
Classification
```

Target column:

```text
Churn
```

---

### Regression

Dataset:

```text
Housing Prices Dataset
```

Task:

```text
Regression
```

Target column example:

```text
price
```

---

### Clustering

Dataset:

```text
Mall Customers Dataset
```

Task:

```text
Clustering
```

Target column:

```text
No target column required
```

---

## Important Notes

### CSV Separator Support

The backend supports CSV files with different separators such as:

- comma `,`
- semicolon `;`

This is handled using automatic separator detection in pandas.

---

### Model Saving

The final trained model is saved using joblib in:

```text
backend/saved_models/best_model.joblib
```

The saved file contains the full pipeline:

```text
preprocessing + trained model
```

---

### Git Ignore

The following should not be pushed to GitHub:

```text
venv/
__pycache__/
backend/uploads/
backend/saved_models/
*.joblib
*.pkl
```

These are local runtime files.

---

## Final Project Flow

```text
User uploads dataset
        ↓
Backend reads CSV or Excel
        ↓
Frontend displays preview and columns
        ↓
User selects ML task
        ↓
User selects target column if needed
        ↓
Backend preprocesses data
        ↓
Backend trains multiple models
        ↓
Backend evaluates models
        ↓
Best model is selected
        ↓
Results are displayed on frontend
        ↓
User downloads trained model
```

---

## Project Status

### Completed

- Dataset upload
- Data preview
- Task selection
- Target column selection
- FastAPI backend
- Automated preprocessing
- Model training
- Model evaluation
- Best model selection
- Model saving
- Model download
- Frontend and backend integration

### Future Improvements

- Add more visualizations
- Improve UI styling
- Add more ML algorithms
- Allow the user to choose the number of clusters
- Add more detailed error messages