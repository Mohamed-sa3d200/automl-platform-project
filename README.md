## Full Project Structure

```
automl-platform-project/
│
├── frontend/                       
│   ├── index.html
│   ├── style.css
│   ├── script.js
│
├── backend/
│   ├── main.py                     
│   ├── preprocessing.py            
│   ├── models.py                   
│   ├── automl.py                   
│   ├── evaluation.py               
│   │
│   ├── utils/
│   │   ├── config.py
│   │   ├── helpers.py
│   │
│   └── __init__.py
│
├── data/
│   ├── sample_classification.csv
│   ├── sample_regression.csv
│
├── saved_models/
│   └── .gitkeep
│
├── tests/
│   ├── test_preprocessing.py
│   ├── test_api.py
│
├── notebooks/
│   └── experiments.ipynb
│
├── docs/
│   ├── architecture.md
│   ├── api_contract.md
│
├── .gitignore
├── requirements.txt
├── README.md
```