from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.cluster import KMeans, AgglomerativeClustering


def get_models(task_type):
    """
    Returns a dictionary of models based on the selected ML task type.

    Supported task types:
    - classification
    - regression
    - clustering
    """

    task_type = task_type.lower()

    if task_type == "classification":
        return {
            "Logistic Regression": LogisticRegression(
                max_iter=1000,
                random_state=42
            ),
            "Random Forest Classifier": RandomForestClassifier(
                n_estimators=100,
                random_state=42
            )
        }

    elif task_type == "regression":
        return {
            "Linear Regression": LinearRegression(),
            "Random Forest Regressor": RandomForestRegressor(
                n_estimators=100,
                random_state=42
            )
        }
    
# ====================================================================================
    elif task_type == "clustering":
        return {
            "KMeans": None,  # k will be selected dynamically in automl.py
            "Agglomerative Clustering": None
        }

    # elif task_type == "clustering":
    #     return {
    #         "KMeans": KMeans(
    #             n_clusters=3,
    #             random_state=42,
    #             n_init=10
    #         ),
    #         "Agglomerative Clustering": AgglomerativeClustering(
    #             n_clusters=3
    #         )
    #     }
# ===================================================================================
    else:
        raise ValueError(
            "Invalid task type. Choose from: classification, regression, clustering."
        )