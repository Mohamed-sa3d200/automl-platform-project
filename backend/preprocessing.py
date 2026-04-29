import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder
from sklearn.preprocessing import StandardScaler

from imblearn.over_sampling import SMOTE

class DataPreprocessor:

    def __init__(self):
        self.preprocessor=None


    def build_preprocessor(self, X):

        numeric_cols = X.select_dtypes(
            include=['int64','float64']
        ).columns

        categorical_cols = X.select_dtypes(
            include=['object','category']
        ).columns


        numeric_pipeline = Pipeline([
            (
                'imputer',
                SimpleImputer(strategy='mean')
            ),
            (
                'scaler',
                StandardScaler()
            )
        ])


        categorical_pipeline = Pipeline([
            (
                'imputer',
                SimpleImputer(
                    strategy='most_frequent'
                )
            ),
            (
                'encoder',
                OneHotEncoder(
                    handle_unknown='ignore'
                )
            )
        ])


        self.preprocessor = ColumnTransformer([
            (
                'num',
                numeric_pipeline,
                numeric_cols
            ),
            (
                'cat',
                categorical_pipeline,
                categorical_cols
            )
        ])

        return self.preprocessor


    def transform_data(self, X):

        if self.preprocessor is None:
            raise Exception(
                'Build preprocessor first.'
            )

        return self.preprocessor.fit_transform(X)


    def apply_smote(self, X,y):

        smote = SMOTE(
            random_state=42
        )

        X_resampled,y_resampled = (
            smote.fit_resample(X,y)
        )

        return X_resampled,y_resampled  