import os
import shutil
import pandas as pd

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from backend.automl import train_automl


app = FastAPI(
    title="AutoML Platform API",
    description="Backend API for automated machine learning application",
    version="1.0.0"
)


# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


UPLOAD_DIR = "backend/uploads"
MODEL_DIR = "backend/saved_models"
MODEL_PATH = os.path.join(MODEL_DIR, "best_model.joblib")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)


# Store the last uploaded file path
last_uploaded_file_path = None


@app.get("/")
def home():
    return {
        "message": "AutoML Platform API is running successfully."
    }


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload CSV or Excel dataset.

    Returns:
    - filename
    - dataset shape
    - column names
    - first 5 rows preview
    """

    import time
    start_time = time.time()
    
    global last_uploaded_file_path

    filename = file.filename
    file_extension = filename.lower()

    if not file_extension.endswith((".csv", ".xlsx")):
        raise HTTPException(
            status_code=400,
            detail="Only CSV and Excel files are supported."
        )

    file_path = os.path.join(UPLOAD_DIR, filename)

    print(f"--> Saving file: {filename}...")
    save_start = time.time()
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    print(f"    Done saving in {time.time() - save_start:.2f} seconds.")

    last_uploaded_file_path = file_path

    try:
        print(f"--> Reading data into Pandas...")
        read_start = time.time()
        if file_extension.endswith(".csv"):
            df = pd.read_csv(file_path)
        else:
            # Excel is naturally slower
            df = pd.read_excel(file_path)
        print(f"    Done reading in {time.time() - read_start:.2f} seconds.")

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error reading file: {str(e)}"
        )

    print(f"--> Total Upload Time: {time.time() - start_time:.2f} seconds.\n")
    return {
        "status": "success",
        "message": "File uploaded successfully.",
        "filename": filename,
        "shape": {
            "rows": df.shape[0],
            "columns": df.shape[1]
        },
        "columns": df.columns.tolist(),
        "preview": df.head().fillna("").to_dict(orient="records")
    }


@app.post("/train")
async def train_model(
    task_type: str = Form(...),
    target_column: str = Form(None)
):
    """
    Train AutoML model based on selected task.

    task_type:
    - classification
    - regression
    - clustering

    target_column is required for classification and regression.
    """

    global last_uploaded_file_path

    if last_uploaded_file_path is None:
        raise HTTPException(
            status_code=400,
            detail="No dataset uploaded. Please upload a dataset first."
        )

    task_type = task_type.lower()

    if task_type == "clustering":
        target_column = None

    if task_type not in ["classification", "regression", "clustering"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid task type. Choose classification, regression, or clustering."
        )

    if task_type in ["classification", "regression"] and not target_column:
        raise HTTPException(
            status_code=400,
            detail="Target column is required for classification and regression."
        )

    try:
        if last_uploaded_file_path.lower().endswith(".csv"):
            df = pd.read_csv(last_uploaded_file_path)
        else:
            df = pd.read_excel(last_uploaded_file_path)

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error reading uploaded dataset: {str(e)}"
        )

    try:
        results = train_automl(
            df=df,
            task_type=task_type,
            target_column=target_column
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Training failed: {str(e)}"
        )

    return {
        "status": "success",
        "message": "Model trained successfully.",
        "task_type": results["task_type"],
        "target_column": results["target_column"],
        "best_model": results["best_model"],
        "best_score": results["best_score"],
        "metrics": results["metrics"],
        "model_download_url": results["model_download_url"]
    }


@app.get("/download-model")
def download_model():
    """
    Download the trained model pipeline as a .joblib file.
    """

    if not os.path.exists(MODEL_PATH):
        raise HTTPException(
            status_code=404,
            detail="No trained model found. Please train a model first."
        )

    return FileResponse(
        path=MODEL_PATH,
        media_type="application/octet-stream",
        filename="best_model.joblib"
    )   