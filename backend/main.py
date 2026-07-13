from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import io
import os
from typing import List, Optional
import ml_functions

app = FastAPI(
    title="EcoHub AI Backend",
    description="API for handling machine learning workflows on sustainability datasets",
    version="1.0.0"
)

# Enable CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify front-end origin (e.g. http://localhost:5173)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global in-memory storage for active dataset
# For local single-user usage, a simple global state is effective and clean.
class DatasetStore:
    def __init__(self):
        self.df: Optional[pd.DataFrame] = None
        self.filename: Optional[str] = None
        self.is_cleaned: bool = False

store = DatasetStore()

# Pydantic models for API Requests
class CleanRequest(BaseModel):
    imputation_strategy: str = "mean"

class EdaRequest(BaseModel):
    x_col: Optional[str] = None
    y_col: Optional[str] = None

class RegressionRequest(BaseModel):
    features: List[str]
    target: str

class KMeansRequest(BaseModel):
    features: List[str]
    k_max: int = 10
    k_selected: int = 3



@app.get("/")
def read_root():
    return {"message": "Welcome to the EcoHub AI Backend API. Connect to endpoints for sustainability machine learning tasks."}

@app.post("/api/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """
    Endpoint to upload a CSV dataset. Parses and caches the DataFrame.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
        
    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        
        # Validate columns
        if len(df.columns) == 0:
            raise HTTPException(status_code=400, detail="The uploaded CSV has no columns.")
            
        store.df = df
        store.filename = file.filename
        store.is_cleaned = False
        
        info = ml_functions.get_dataset_info(df)
        return {
            "status": "success",
            "filename": file.filename,
            "is_cleaned": store.is_cleaned,
            "info": info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

@app.get("/api/dataset/status")
def get_dataset_status():
    """
    Returns the status of the loaded dataset.
    """
    if store.df is None:
        return {"loaded": False}
        
    info = ml_functions.get_dataset_info(store.df)
    return {
        "loaded": True,
        "filename": store.filename,
        "is_cleaned": store.is_cleaned,
        "info": info
    }

@app.delete("/api/dataset")
def delete_dataset():
    """
    Removes the loaded dataset from the server.
    """
    store.df = None
    store.filename = None
    store.is_cleaned = False
    return {"status": "success", "message": "Dataset removed."}

@app.post("/api/clean")
def clean_data(request: CleanRequest):
    """
    Cleans the loaded dataset and returns updated information.
    """
    if store.df is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Please upload a dataset first.")
        
    try:
        cleaned_df = ml_functions.clean_dataset(
            store.df, 
            imputation_strategy=request.imputation_strategy
        )
        # Save cleaned dataset in store
        store.df = cleaned_df
        store.is_cleaned = True
        
        info = ml_functions.get_dataset_info(cleaned_df)
        return {
            "status": "success",
            "filename": store.filename,
            "is_cleaned": store.is_cleaned,
            "info": info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data cleaning failed: {str(e)}")

@app.post("/api/eda")
def get_eda(request: EdaRequest):
    """
    Generates statistics and chart inputs for the active dataset.
    """
    if store.df is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Please upload a dataset first.")
        
    try:
        eda_data = ml_functions.get_eda_data(
            store.df,
            x_col=request.x_col,
            y_col=request.y_col
        )
        return eda_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate EDA data: {str(e)}")

@app.post("/api/linear-regression")
def linear_regression(request: RegressionRequest):
    """
    Performs Linear Regression on the active dataset.
    """
    if store.df is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Please upload a dataset first.")
        
    if not request.features or not request.target:
        raise HTTPException(status_code=400, detail="Both features (list) and target (string) must be specified.")
        
    # Validation checks
    missing_cols = [col for col in request.features + [request.target] if col not in store.df.columns]
    if missing_cols:
        raise HTTPException(status_code=400, detail=f"Columns not found in dataset: {missing_cols}")
        
    try:
        results = ml_functions.run_linear_regression(
            store.df,
            features=request.features,
            target=request.target
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Linear Regression failed: {str(e)}")

@app.post("/api/logistic-regression")
def logistic_regression(request: RegressionRequest):
    """
    Performs Logistic Regression on the active dataset.
    """
    if store.df is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Please upload a dataset first.")
        
    if not request.features or not request.target:
        raise HTTPException(status_code=400, detail="Both features (list) and target (string) must be specified.")
        
    # Validation checks
    missing_cols = [col for col in request.features + [request.target] if col not in store.df.columns]
    if missing_cols:
        raise HTTPException(status_code=400, detail=f"Columns not found in dataset: {missing_cols}")
        
    try:
        results = ml_functions.run_logistic_regression(
            store.df,
            features=request.features,
            target=request.target
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Logistic Regression failed: {str(e)}")

@app.post("/api/kmeans")
def kmeans_clustering(request: KMeansRequest):
    """
    Performs K-Means clustering on the active dataset.
    """
    if store.df is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Please upload a dataset first.")
        
    if not request.features:
        raise HTTPException(status_code=400, detail="At least one feature must be selected for K-Means.")
        
    # Validation checks
    missing_cols = [col for col in request.features if col not in store.df.columns]
    if missing_cols:
        raise HTTPException(status_code=400, detail=f"Columns not found in dataset: {missing_cols}")
        
    try:
        results = ml_functions.run_kmeans_clustering(
            store.df,
            features=request.features,
            k_max=request.k_max,
            k_selected=request.k_selected
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"K-Means Clustering failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
