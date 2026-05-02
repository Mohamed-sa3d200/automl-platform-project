import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder
from sklearn.preprocessing import StandardScaler

from imblearn.over_sampling import SMOTE


class DataPreprocessor:

    def __init__(self):
        self.preprocessor = None
        self.numeric_cols = None
        self.categorical_cols = None
        self.datetime_cols = None

    # --------------------------------------------------
    # 1. Basic Data Cleaning
    # --------------------------------------------------
    def clean_data(self, df, missing_threshold=0.8):
        """
        Cleans the dataset before preprocessing.

        Steps:
        - Remove duplicate rows
        - Remove columns that are completely empty
        - Remove columns with too many missing values
        - Convert datetime columns into year/month/day features
        """

        df = df.copy()

        # Remove duplicate rows
        df = df.drop_duplicates()

        # Remove columns that are fully missing
        df = df.dropna(axis=1, how="all")

        # Remove columns with missing values above threshold
        missing_ratio = df.isnull().mean()
        cols_to_drop = missing_ratio[missing_ratio > missing_threshold].index
        df = df.drop(columns=cols_to_drop)

        # Convert possible datetime columns
        df = self.handle_datetime_columns(df)

        return df

    # --------------------------------------------------
    # 2. Datetime Handling
    # --------------------------------------------------
    def handle_datetime_columns(self, df):
        """
        Detect datetime-like columns and convert them into:
        year, month, day

        Original datetime columns are dropped.
        """

        df = df.copy()

        for col in df.columns:
            if df[col].dtype == "object":
                sample = df[col].dropna().head(50)
                if len(sample) == 0:
                    continue
                try:
                    # Test on small sample first to avoid slow dateutil fallback
                    pd.to_datetime(sample, errors="raise")
                    
                    converted_col = pd.to_datetime(df[col], errors="coerce")

                    # If conversion works, create date features
                    if converted_col.notnull().any():
                        df[col + "_year"] = converted_col.dt.year
                        df[col + "_month"] = converted_col.dt.month
                        df[col + "_day"] = converted_col.dt.day
                        df = df.drop(columns=[col])

                except Exception:
                    # If column is not datetime, keep it as it is
                    pass

        return df

    # --------------------------------------------------
    # 3. Split Features and Target
    # --------------------------------------------------
    def split_features_target(self, df, target_column):
        """
        Splits dataset into X and y for supervised learning.
        Used for classification and regression.
        """

        if target_column is None:
            raise ValueError("Target column is required for supervised learning.")

        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found in dataset.")

        X = df.drop(columns=[target_column])
        y = df[target_column]

        return X, y

    # --------------------------------------------------
    # 4. Prepare Data Based on Task Type
    # --------------------------------------------------
    def prepare_data(self, df, task_type, target_column=None):
        """
        Prepares data depending on the ML task.

        For classification/regression:
            returns X, y

        For clustering:
            returns X, None
        """

        df = self.clean_data(df)

        task_type = task_type.lower()

        if task_type in ["classification", "regression"]:
            X, y = self.split_features_target(df, target_column)
            return X, y

        elif task_type == "clustering":
            X = df.copy()
            y = None
            return X, y

        else:
            raise ValueError(
                "Invalid task type. Choose from: classification, regression, clustering."
            )

    # --------------------------------------------------
    # 5. Build Preprocessor
    # --------------------------------------------------
    def build_preprocessor(self, X):
        """
        Builds preprocessing pipeline for numerical and categorical columns.

        Numerical:
        - Missing values: mean
        - Scaling: StandardScaler

        Categorical:
        - Missing values: most frequent
        - Encoding: OneHotEncoder
        """

        self.numeric_cols = X.select_dtypes(
            include=["int64", "float64", "int32", "float32", "bool"]
        ).columns

        self.categorical_cols = X.select_dtypes(
            include=["object", "category"]
        ).columns

        numeric_pipeline = Pipeline([
            (
                "imputer",
                SimpleImputer(strategy="mean")
            ),
            (
                "scaler",
                StandardScaler()
            )
        ])

        categorical_pipeline = Pipeline([
            (
                "imputer",
                SimpleImputer(strategy="most_frequent")
            ),
            (
                "encoder",
                OneHotEncoder(handle_unknown="ignore")
            )
        ])

        self.preprocessor = ColumnTransformer([
            (
                "num",
                numeric_pipeline,
                self.numeric_cols
            ),
            (
                "cat",
                categorical_pipeline,
                self.categorical_cols
            )
        ])

        return self.preprocessor

    # --------------------------------------------------
    # 6. Fit and Transform Training Data
    # --------------------------------------------------
    def fit_transform_data(self, X):
        """
        Fits the preprocessor on training data and transforms it.
        """

        if self.preprocessor is None:
            raise Exception("Build preprocessor first.")

        return self.preprocessor.fit_transform(X)

    # --------------------------------------------------
    # 7. Transform New/Test Data
    # --------------------------------------------------
    def transform_new_data(self, X):
        """
        Transforms new/test data using the already fitted preprocessor.
        """

        if self.preprocessor is None:
            raise Exception("Build and fit preprocessor first.")

        return self.preprocessor.transform(X)

    # --------------------------------------------------
    # 8. Keep Old Function Name for Compatibility
    # --------------------------------------------------
    def transform_data(self, X):
        """
        Old function kept so existing code does not break.
        It fits and transforms the data.
        """

        return self.fit_transform_data(X)

    # --------------------------------------------------
    # 9. Check Class Imbalance
    # --------------------------------------------------
    def is_imbalanced(self, y, threshold=0.4):
        """
        Checks if classification target is imbalanced.

        If the smallest class percentage is below the threshold,
        we consider the target imbalanced.
        """

        class_distribution = y.value_counts(normalize=True)

        if len(class_distribution) <= 1:
            return False

        minority_class_ratio = class_distribution.min()

        return minority_class_ratio < threshold

    # --------------------------------------------------
    # 10. Apply SMOTE
    # --------------------------------------------------
    def apply_smote(self, X, y):
        """
        Applies SMOTE oversampling.
        Should be used only for classification after preprocessing.
        """

        smote = SMOTE(random_state=42)

        X_resampled, y_resampled = smote.fit_resample(X, y)

        return X_resampled, y_resampled

    # --------------------------------------------------
    # 11. Apply SMOTE Only When Needed
    # --------------------------------------------------
    def apply_smote_if_needed(self, X, y, task_type):
        """
        Applies SMOTE only if:
        - task is classification
        - target is imbalanced
        """

        task_type = task_type.lower()

        if task_type == "classification" and self.is_imbalanced(y):
            return self.apply_smote(X, y)

        return X, y