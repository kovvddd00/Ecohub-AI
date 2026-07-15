from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import io
import os
from typing import List, Optional
import ml_functions
import persona_carbo

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
    remove_duplicates: bool = False
    handle_invalid: bool = False
    treat_outliers: bool = False

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

class FeatureSelectionRequest(BaseModel):
    features: List[str]
    target: str
    method: str = "random_forest"
    k: int = 20

class PcaRequest(BaseModel):
    features: List[str]

class AnnRequest(BaseModel):
    features: List[str]
    target: str
    epochs: int = 100
    batch_size: int = 32

class RecommendationRequest(BaseModel):
    user_profile: dict

class AiRecommendationRequest(BaseModel):
    user_profile: dict
    api_key: Optional[str] = None

class SerializeRequest(BaseModel):
    regression_features: List[str]
    classification_features: List[str]
    target: str

class PersonaCarboInput(BaseModel):
    name: Optional[str] = "User"
    age: Optional[int] = 25
    country: Optional[str] = ""
    city: Optional[str] = ""
    familySize: Optional[int] = 1
    workType: Optional[str] = "Office"
    vehicleType: Optional[str] = "None"
    kmTravelledPerWeek: Optional[float] = 0.0
    flightsPerYear: Optional[float] = 0.0
    publicTransportUsage: Optional[str] = "Never"
    monthlyElectricityKwh: Optional[float] = None
    monthlyElectricityBill: Optional[float] = None
    acUnits: Optional[int] = 0
    acUsageHoursPerDay: Optional[float] = 0.0
    ledBulbs: Optional[str] = "No"
    solarPanels: Optional[str] = "No"
    dietType: Optional[str] = "Vegetarian"
    meatMealsPerWeek: Optional[float] = 0.0
    milkConsumption: Optional[str] = "Medium"
    foodWaste: Optional[str] = "Medium"
    dailyWaterUsage: Optional[float] = 150.0
    showerDuration: Optional[str] = "Medium"
    washingMachineUsagePerWeek: Optional[float] = 3.0
    plasticWaste: Optional[str] = "Medium"
    recycling: Optional[str] = "Sometimes"
    composting: Optional[str] = "No"
    clothesPurchasedPerMonth: Optional[float] = 2.0
    onlineOrdersPerMonth: Optional[float] = 4.0
    electronicsPurchasedPerYear: Optional[float] = 1.0

def generate_sample_data() -> pd.DataFrame:
    """
    Generates mock dataset for testing workflows.
    """
    data = {
        # Existing test_ml.py expected columns
        "GDP_per_Capita": [12000.0, 15000.0, 22000.0, 8000.0, 45000.0, 31000.0, 18000.0, 25000.0, 9500.0, 41000.0],
        "Forest_Area_Percentage": [25.5, 30.2, 15.1, 40.0, 10.5, 18.2, 35.0, 22.0, 28.1, 12.3],
        "Renewable_Energy_Share": [18.2, 22.0, 35.5, 5.0, 45.0, 12.5, 29.0, 15.0, 8.2, 40.0],
        "CO2_Emissions": [4.5, 5.2, 3.1, 8.0, 2.2, 6.1, 4.0, 4.8, 7.2, 2.5],
        "High_Emissions": [1, 1, 0, 1, 0, 1, 0, 1, 1, 0],
        # Sustainability dataset columns
        "User_ID": list(range(1, 11)),
        "Age": [25, 34, 45, 19, 52, 28, 41, 30, 23, 38],
        "Gender": ["Male", "Female", "Female", "Male", "Female", "Male", "Female", "Male", "Male", "Female"],
        "Country": ["USA", "India", "Germany", "India", "USA", "Germany", "USA", "India", "Germany", "USA"],
        "State": ["CA", "MH", "BY", "DL", "NY", "HE", "TX", "KA", "BE", "FL"],
        "Occupation": ["Engineer", "Student", "Teacher", "Student", "Manager", "Designer", "Clerk", "Engineer", "Student", "Manager"],
        "Education": ["Bachelor", "High School", "Master", "High School", "PhD", "Bachelor", "Bachelor", "Master", "Bachelor", "PhD"],
        "Body_Type": ["Average", "Athletic", "Heavy", "Average", "Athletic", "Average", "Heavy", "Average", "Athletic", "Average"],
        "Diet": ["Non-Vegetarian", "Vegetarian", "Vegan", "Eggetarian", "Non-Vegetarian", "Vegetarian", "Vegan", "Non-Vegetarian", "Eggetarian", "Vegetarian"],
        "Smoking": ["No", "No", "No", "Yes", "No", "No", "No", "Yes", "No", "No"],
        "Alcohol": ["Yes", "No", "Yes", "Yes", "No", "Yes", "No", "Yes", "No", "No"],
        "Vehicle_Type": ["Car", "None", "Bicycle", "Bike", "EV", "Car", "None", "Bike", "Bus", "EV"],
        "Transport_Mode": ["Private", "Walk", "Cycle", "Private", "Public", "Private", "Walk", "Mixed", "Public", "Public"],
        "Daily_Travel_km": [15, 2, 5, 20, 35, 12, 0, 22, 8, 45],
        "Flights_Per_Year": [2, 0, 1, 0, 4, 1, 0, 2, 0, 3],
        "Electricity_kWh_Month": [250, 120, 80, 180, 450, 310, 150, 280, 95, 390],
        "Water_Consumption_L_Day": [350, 180, 120, 250, 500, 420, 200, 310, 150, 480],
        "Internet_Hours_Day": [5.0, 3.0, 2.0, 6.0, 4.0, 8.0, 3.0, 5.0, 7.0, 4.0],
        "Screen_Time_Hours": [6.0, 4.0, 3.0, 8.0, 5.0, 9.0, 4.0, 6.0, 8.0, 5.0],
        "Waste_Generated_kg_Week": [4.5, 2.0, 1.0, 5.5, 8.0, 6.0, 3.0, 4.8, 2.5, 7.2],
        "Plastic_Items_Week": [12, 4, 2, 20, 8, 15, 5, 18, 6, 10],
        "Recycling_Habit": ["Often", "Always", "Always", "Never", "Often", "Sometimes", "Often", "Sometimes", "Always", "Often"],
        "Renewable_Energy": ["No", "Yes", "Yes", "No", "Yes", "No", "No", "No", "Yes", "Yes"],
        "Monthly_Income": [5000, 1500, 3500, 800, 8000, 4000, 2500, 4500, 1200, 6000],
        "Household_Size": [3, 4, 2, 5, 2, 3, 1, 4, 5, 2],
        "Trees_Planted_Per_Year": [2, 5, 10, 0, 4, 1, 3, 0, 6, 5],
        "Green_Score": [75.0, 88.0, 95.0, 40.0, 82.0, 65.0, 70.0, 55.0, 85.0, 90.0],
        "Carbon_Footprint_tCO2e_Target": [4.8, 2.1, 1.2, 6.5, 3.2, 5.8, 2.8, 5.2, 2.5, 3.0]
    }
    return pd.DataFrame(data)



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
            imputation_strategy=request.imputation_strategy,
            remove_duplicates=request.remove_duplicates,
            handle_invalid=request.handle_invalid,
            treat_outliers=request.treat_outliers
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

@app.post("/api/features/engineer")
def engineer_features_endpoint():
    """
    Applies the notebook feature engineering pipeline to the active dataset in memory.
    """
    if store.df is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Please upload a dataset first.")
        
    try:
        engineered_df = ml_functions.engineer_features(store.df)
        store.df = engineered_df
        
        info = ml_functions.get_dataset_info(engineered_df)
        return {
            "status": "success",
            "filename": store.filename,
            "is_cleaned": store.is_cleaned,
            "info": info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feature engineering failed: {str(e)}")

@app.post("/api/features/select")
def select_features(request: FeatureSelectionRequest):
    """
    Runs feature selection using standard algorithms from the notebook.
    """
    if store.df is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Please upload a dataset first.")
        
    missing_cols = [col for col in request.features + [request.target] if col not in store.df.columns]
    if missing_cols:
        raise HTTPException(status_code=400, detail=f"Columns not found in dataset: {missing_cols}")
        
    try:
        results = ml_functions.run_feature_selection(
            store.df,
            features=request.features,
            target=request.target,
            method=request.method,
            k=request.k
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Feature selection failed: {str(e)}")

@app.post("/api/features/pca")
def run_pca_endpoint(request: PcaRequest):
    """
    Runs Principal Component Analysis (PCA) on selected features.
    """
    if store.df is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Please upload a dataset first.")
        
    missing_cols = [col for col in request.features if col not in store.df.columns]
    if missing_cols:
        raise HTTPException(status_code=400, detail=f"Columns not found in dataset: {missing_cols}")
        
    try:
        results = ml_functions.run_pca_analysis(store.df, features=request.features)
        return results
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PCA failed: {str(e)}")

@app.post("/api/compare/regression")
def compare_regression_endpoint(request: RegressionRequest):
    """
    Evaluates and compares multiple regression models.
    """
    if store.df is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Please upload a dataset first.")
        
    missing_cols = [col for col in request.features + [request.target] if col not in store.df.columns]
    if missing_cols:
        raise HTTPException(status_code=400, detail=f"Columns not found in dataset: {missing_cols}")
        
    try:
        results = ml_functions.compare_regression_models(
            store.df,
            features=request.features,
            target=request.target
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Regression comparison failed: {str(e)}")

@app.post("/api/compare/classification")
def compare_classification_endpoint(request: RegressionRequest):
    """
    Evaluates and compares multiple classification models.
    """
    if store.df is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Please upload a dataset first.")
        
    missing_cols = [col for col in request.features + [request.target] if col not in store.df.columns]
    if missing_cols:
        raise HTTPException(status_code=400, detail=f"Columns not found in dataset: {missing_cols}")
        
    try:
        results = ml_functions.compare_classification_models(
            store.df,
            features=request.features,
            target=request.target
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Classification comparison failed: {str(e)}")

@app.post("/api/train/ann")
def train_ann_endpoint(request: AnnRequest):
    """
    Trains Keras Sequential Deep Learning model on active dataset features.
    """
    if store.df is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Please upload a dataset first.")
        
    missing_cols = [col for col in request.features + [request.target] if col not in store.df.columns]
    if missing_cols:
        raise HTTPException(status_code=400, detail=f"Columns not found in dataset: {missing_cols}")
        
    try:
        results = ml_functions.run_ann_regression(
            store.df,
            features=request.features,
            target=request.target,
            epochs=request.epochs,
            batch_size=request.batch_size
        )
        return results
    except ImportError as ie:
        raise HTTPException(status_code=501, detail=str(ie))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"ANN training failed: {str(e)}")

@app.post("/api/recommendations/rule-based")
def rule_based_recommendations(request: RecommendationRequest):
    """
    Generates static rule-based carbon footprint recommendations.
    """
    try:
        results = ml_functions.generate_sustainability_report(request.user_profile)
        return results
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to generate report: {str(e)}")

@app.post("/api/recommendations/ai")
def ai_recommendations(request: AiRecommendationRequest):
    """
    Generates personalized Gemini AI carbon advice/report using google-genai.
    """
    try:
        results = ml_functions.generate_ai_report(request.user_profile, api_key=request.api_key)
        return results
    except ImportError as ie:
        raise HTTPException(status_code=501, detail=str(ie))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"GenAI report generation failed: {str(e)}")

@app.post("/api/models/serialize")
def serialize_models_endpoint(request: SerializeRequest):
    """
    Fits and serializes the best regression, classification, and scaler objects.
    """
    if store.df is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Please upload a dataset first.")
        
    all_features = list(set(request.regression_features + request.classification_features))
    missing_cols = [col for col in all_features + [request.target] if col not in store.df.columns]
    if missing_cols:
        raise HTTPException(status_code=400, detail=f"Columns not found in dataset: {missing_cols}")
        
    try:
        results = ml_functions.serialize_best_models(
            store.df,
            regression_features=request.regression_features,
            classification_features=request.classification_features,
            target=request.target,
            model_dir="models"
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Model serialization failed: {str(e)}")

@app.post("/api/persona-carbo/calculate")
def calculate_persona_carbo(request: PersonaCarboInput):
    """
    Exposes the carbon footprint calculator, saves the assessment, and returns JSON.
    """
    try:
        user_data = request.model_dump()
        result_data = persona_carbo.calculate_personal_carbon(user_data)
        
        # Generate an assessment ID
        import uuid
        assessment_id = str(uuid.uuid4())[:8]
        result_data["id"] = assessment_id
        
        # Save to SQLite database
        persona_carbo.save_assessment(
            assessment_id=assessment_id,
            name=user_data.get("name", "User"),
            age=int(user_data.get("age", 25) or 25),
            country=user_data.get("country", ""),
            city=user_data.get("city", ""),
            total_carbon=int(result_data.get("totalCarbonFootprint", 0)),
            score=int(result_data.get("sustainabilityScore", 0)),
            rating=result_data.get("rating", "Average"),
            user_data=user_data,
            result_data=result_data
        )
        
        return result_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Calculation failed: {str(e)}")

@app.get("/api/persona-carbo/history")
def get_persona_carbo_history():
    """
    Fetches past carbon footprint assessments.
    """
    try:
        history = persona_carbo.get_history()
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")

@app.get("/api/persona-carbo/report/{id}")
def get_persona_carbo_report(id: str):
    """
    Generates and returns the PDF assessment report as a streaming file download.
    """
    try:
        report_data = persona_carbo.get_report_by_id(id)
        if not report_data:
            raise HTTPException(status_code=404, detail="Report not found")
            
        user_data = report_data["user_data"]
        result_data = report_data["result_data"]
        
        pdf_buf = persona_carbo.generate_pdf_report(user_data, result_data)
        pdf_buf.seek(0)
        
        from fastapi.responses import StreamingResponse
        return StreamingResponse(
            pdf_buf,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=persona_carbo_{id}.pdf"}
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

@app.get("/api/persona-carbo/assessment/{id}")
def get_persona_carbo_assessment(id: str):
    """
    Retrieves the raw JSON data of a specific assessment.
    """
    try:
        report_data = persona_carbo.get_report_by_id(id)
        if not report_data:
            raise HTTPException(status_code=404, detail="Assessment not found")
        return report_data
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch assessment: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)


