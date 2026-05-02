import os
import joblib

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline as SklearnPipeline
from imblearn.pipeline import Pipeline as ImbPipeline
from imblearn.over_sampling import SMOTE

from backend.preprocessing import DataPreprocessor
from backend.models import get_models
from backend.evaluation import (
    evaluate_classification,
    evaluate_regression,
    evaluate_clustering,
    get_main_score
)


def train_automl(df, task_type, target_column=None):
    """
    Main AutoML training function.

    It handles:
    - Data preparation
    - Preprocessing
    - Model training
    - Model evaluation
    - Best model selection
    - Saving the final pipeline
    """

    task_type = task_type.lower()

    preprocessor_obj = DataPreprocessor()

    X, y = preprocessor_obj.prepare_data(
        df=df,
        task_type=task_type,
        target_column=target_column
    )

    models = get_models(task_type)

    results = {}
    best_model_name = None
    best_pipeline = None
    best_score = None

    os.makedirs("backend/saved_models", exist_ok=True)

    # --------------------------------------------------
    # Classification
    # --------------------------------------------------
    if task_type == "classification":

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.2,
            random_state=42,
            stratify=y
        )

        use_smote = preprocessor_obj.is_imbalanced(y_train)

        for model_name, model in models.items():

            preprocessor = preprocessor_obj.build_preprocessor(X_train)

            if use_smote:
                pipeline = ImbPipeline([
                    ("preprocessor", preprocessor),
                    ("smote", SMOTE(random_state=42)),
                    ("model", model)
                ])
            else:
                pipeline = SklearnPipeline([
                    ("preprocessor", preprocessor),
                    ("model", model)
                ])

            pipeline.fit(X_train, y_train)

            y_pred = pipeline.predict(X_test)

            metrics = evaluate_classification(y_test, y_pred)

            results[model_name] = metrics

            current_score = get_main_score(task_type, metrics)

            if best_score is None or current_score > best_score:
                best_score = current_score
                best_model_name = model_name
                best_pipeline = pipeline

    # --------------------------------------------------
    # Regression
    # --------------------------------------------------
    elif task_type == "regression":

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.2,
            random_state=42
        )

        for model_name, model in models.items():

            preprocessor = preprocessor_obj.build_preprocessor(X_train)

            pipeline = SklearnPipeline([
                ("preprocessor", preprocessor),
                ("model", model)
            ])

            pipeline.fit(X_train, y_train)

            y_pred = pipeline.predict(X_test)

            metrics = evaluate_regression(y_test, y_pred)

            results[model_name] = metrics

            current_score = get_main_score(task_type, metrics)

            if best_score is None or current_score > best_score:
                best_score = current_score
                best_model_name = model_name
                best_pipeline = pipeline

    # --------------------------------------------------
    # Clustering
    # --------------------------------------------------
    elif task_type == "clustering":

        preprocessor = preprocessor_obj.build_preprocessor(X)
        X_processed = preprocessor.fit_transform(X)

        import numpy as np
        if X_processed.shape[0] > 5000:
            np.random.seed(42)
            indices = np.random.choice(X_processed.shape[0], 5000, replace=False)
            X_sample = X_processed[indices]
        else:
            X_sample = X_processed

        max_k = min(10, X_sample.shape[0] - 1)
        if max_k < 2:
            max_k = 2

        for model_name, model in models.items():
            if model_name == "Agglomerative Clustering" and X_processed.shape[0] > 5000:
                continue

            best_k = 2
            best_model_score = -1.0

            for k in range(2, max_k + 1):
                model.set_params(n_clusters=k)
                sample_labels = model.fit_predict(X_sample)
                
                score = evaluate_clustering(X_sample, sample_labels)["silhouette_score"]
                
                if score > best_model_score:
                    best_model_score = score
                    best_k = k

            model.set_params(n_clusters=best_k)
            full_labels = model.fit_predict(X_processed)

            pipeline = SklearnPipeline([
                ("preprocessor", preprocessor_obj.build_preprocessor(X)),
                ("model", model)
            ])
            pipeline.fit(X)

            metrics = evaluate_clustering(X_processed, full_labels)
            metrics["optimal_clusters"] = best_k
            results[model_name] = metrics

            current_score = get_main_score(task_type, metrics)

            if best_score is None or current_score > best_score:
                best_score = current_score
                best_model_name = model_name
                best_pipeline = pipeline

    else:
        raise ValueError(
            "Invalid task type. Choose from: classification, regression, clustering."
        )

    # --------------------------------------------------
    # Save Best Model Pipeline
    # --------------------------------------------------
    model_path = "backend/saved_models/best_model.joblib"

    joblib.dump(best_pipeline, model_path)

    return {
        "status": "success",
        "message": "Model trained successfully.",
        "task_type": task_type,
        "target_column": target_column,
        "best_model": best_model_name,
        "best_score": float(best_score),
        "metrics": results,
        "model_download_url": "/download-model"
    }