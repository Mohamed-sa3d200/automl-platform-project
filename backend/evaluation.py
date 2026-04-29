from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    silhouette_score
)


def evaluate_classification(y_true, y_pred):
    """
    Evaluate classification model.
    """

    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(
            precision_score(
                y_true,
                y_pred,
                average="weighted",
                zero_division=0
            )
        ),
        "recall": float(
            recall_score(
                y_true,
                y_pred,
                average="weighted",
                zero_division=0
            )
        ),
        "f1_score": float(
            f1_score(
                y_true,
                y_pred,
                average="weighted",
                zero_division=0
            )
        ),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist()
    }


def evaluate_regression(y_true, y_pred):
    """
    Evaluate regression model.
    """

    return {
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "mse": float(mean_squared_error(y_true, y_pred)),
        "r2_score": float(r2_score(y_true, y_pred))
    }


def evaluate_clustering(X_processed, labels):
    """
    Evaluate clustering model using Silhouette Score.
    """

    unique_labels = set(labels)

    # Silhouette Score needs at least 2 clusters
    if len(unique_labels) < 2:
        return {
            "silhouette_score": -1.0
        }

    return {
        "silhouette_score": float(
            silhouette_score(X_processed, labels)
        )
    }


def get_main_score(task_type, metrics):
    """
    Returns the score used to compare models.

    Classification: F1-score
    Regression: R2-score
    Clustering: Silhouette Score
    """

    task_type = task_type.lower()

    if task_type == "classification":
        return metrics["f1_score"]

    elif task_type == "regression":
        return metrics["r2_score"]

    elif task_type == "clustering":
        return metrics["silhouette_score"]

    else:
        raise ValueError("Invalid task type.")