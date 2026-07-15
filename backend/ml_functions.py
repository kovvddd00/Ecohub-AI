import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge, Lasso
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import (
    RandomForestClassifier,
    RandomForestRegressor,
    GradientBoostingClassifier,
    GradientBoostingRegressor,
)
from sklearn.neighbors import KNeighborsClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.svm import SVC
from sklearn.cluster import KMeans
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report,
    silhouette_score,
)
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder
from sklearn.decomposition import PCA
from sklearn.feature_selection import SelectKBest, f_regression, RFE, VarianceThreshold
import json
import os
import joblib

def get_dataset_info(df: pd.DataFrame) -> dict:
    """
    Returns basic metadata and information about the dataset.
    """
    row_count, col_count = df.shape
    columns_info = []
    
    for col in df.columns:
        null_count = int(df[col].isnull().sum())
        null_percentage = float((null_count / row_count) * 100) if row_count > 0 else 0
        dtype = str(df[col].dtype)
        unique_count = int(df[col].nunique())
        
        columns_info.append({
            "name": col,
            "type": dtype,
            "null_count": null_count,
            "null_percentage": round(null_percentage, 2),
            "unique_count": unique_count
        })
        
    # Get a preview of the dataset
    preview_df = df.head(10).replace({np.nan: None})
    preview_data = preview_df.to_dict(orient="records")
    
    return {
        "row_count": row_count,
        "col_count": col_count,
        "columns": columns_info,
        "preview": preview_data
    }

def clean_dataset(
    df: pd.DataFrame,
    imputation_strategy: str = "mean",
    scale_features: bool = False,
    remove_duplicates: bool = False,
    handle_invalid: bool = False,
    treat_outliers: bool = False
) -> pd.DataFrame:
    """
    Performs data cleaning:
    - Imputes nulls (numerical with mean/median/mode, categorical with mode).
    - Removes duplicates if remove_duplicates is True.
    - Handles invalid negative values (replaces with median of non-negative values) if handle_invalid is True.
    - Caps outliers using IQR (clip to [Q1 - 1.5*IQR, Q3 + 1.5*IQR]) if treat_outliers is True.
    - Optionally scales numerical columns if scale_features is True.
    """
    cleaned_df = df.copy()
    
    # 1. Remove duplicates
    if remove_duplicates:
        cleaned_df.drop_duplicates(inplace=True)
        
    # 2. Impute missing values
    numeric_cols = cleaned_df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        if cleaned_df[col].isnull().sum() > 0:
            if imputation_strategy == "mean":
                fill_val = cleaned_df[col].mean()
            elif imputation_strategy == "median":
                fill_val = cleaned_df[col].median()
            else: # mode
                fill_val = cleaned_df[col].mode().iloc[0] if not cleaned_df[col].mode().empty else 0
            
            cleaned_df[col] = cleaned_df[col].fillna(fill_val)
            
    categorical_cols = cleaned_df.select_dtypes(exclude=[np.number]).columns
    for col in categorical_cols:
        if cleaned_df[col].isnull().sum() > 0:
            fill_val = cleaned_df[col].mode().iloc[0] if not cleaned_df[col].mode().empty else "Unknown"
            cleaned_df[col] = cleaned_df[col].fillna(fill_val)
            
    # 3. Handle invalid values (negative values where they should be positive/non-negative)
    if handle_invalid:
        # We check numeric columns for negative values and replace them with the median of non-negative values
        for col in numeric_cols:
            if (cleaned_df[col] < 0).any():
                non_neg_median = cleaned_df.loc[cleaned_df[col] >= 0, col].median()
                if pd.isna(non_neg_median):
                    non_neg_median = 0
                cleaned_df.loc[cleaned_df[col] < 0, col] = non_neg_median

    # 4. Outlier treatment
    if treat_outliers:
        for col in numeric_cols:
            # We don't want to treat IDs or binary/categorical codes as continuous variables for outlier clipping
            if col.lower() in ["user_id", "id"] or cleaned_df[col].nunique() <= 5:
                continue
            Q1 = cleaned_df[col].quantile(0.25)
            Q3 = cleaned_df[col].quantile(0.75)
            IQR = Q3 - Q1
            lower = Q1 - 1.5 * IQR
            upper = Q3 + 1.5 * IQR
            cleaned_df[col] = cleaned_df[col].clip(lower, upper)
            
    # 5. Scaling
    if scale_features:
        scaler = StandardScaler()
        # Scale only numeric columns except ID-like or target
        cols_to_scale = [c for c in numeric_cols if c.lower() not in ["user_id", "id", "carbon_footprint_tco2e_target"]]
        if cols_to_scale:
            cleaned_df[cols_to_scale] = scaler.fit_transform(cleaned_df[cols_to_scale])
            
    return cleaned_df

def get_eda_data(df: pd.DataFrame, x_col: str = None, y_col: str = None) -> dict:
    """
    Generates statistics and chart data for EDA:
    - Histogram data for numeric columns
    - Boxplot data for numeric columns
    - Correlation matrix heatmap data
    - Scatter plot points for x_col vs y_col
    """
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
    
    # 1. Summary Stats
    summary_stats = {}
    for col in numeric_cols:
        desc = df[col].describe()
        summary_stats[col] = {
            "mean": float(desc["mean"]),
            "std": float(desc["std"]),
            "min": float(desc["min"]),
            "25%": float(desc["25%"]),
            "50%": float(desc["50%"]),
            "75%": float(desc["75%"]),
            "max": float(desc["max"]),
        }
        
    # 2. Histograms (for numeric columns)
    histograms = {}
    for col in numeric_cols:
        non_null = df[col].dropna()
        if len(non_null) > 0:
            counts, bin_edges = np.histogram(non_null, bins=10)
            bins_data = []
            for i in range(len(counts)):
                label = f"{round(bin_edges[i], 2)} - {round(bin_edges[i+1], 2)}"
                bins_data.append({
                    "bin": label,
                    "count": int(counts[i]),
                    "min": float(bin_edges[i]),
                    "max": float(bin_edges[i+1])
                })
            histograms[col] = bins_data
            
    # 3. Boxplots
    boxplots = {}
    for col in numeric_cols:
        col_data = df[col].dropna().values
        if len(col_data) > 0:
            q1, median, q3 = np.percentile(col_data, [25, 50, 75])
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            
            # Outliers
            outliers = col_data[(col_data < lower_bound) | (col_data > upper_bound)]
            # Filter non-outliers for min/max lines
            non_outliers = col_data[(col_data >= lower_bound) & (col_data <= upper_bound)]
            
            min_val = float(np.min(non_outliers)) if len(non_outliers) > 0 else float(q1)
            max_val = float(np.max(non_outliers)) if len(non_outliers) > 0 else float(q3)
            
            # Sample outliers to max 50 to avoid heavy payloads
            sampled_outliers = [float(x) for x in outliers[:50]]
            
            boxplots[col] = {
                "min": min_val,
                "q1": float(q1),
                "median": float(median),
                "q3": float(q3),
                "max": max_val,
                "outliers": sampled_outliers
            }
            
    # 4. Correlation Heatmap
    heatmap = []
    if len(numeric_cols) > 1:
        corr_matrix = df[numeric_cols].corr().fillna(0)
        for i, col1 in enumerate(numeric_cols):
            for j, col2 in enumerate(numeric_cols):
                heatmap.append({
                    "x": col1,
                    "y": col2,
                    "value": round(float(corr_matrix.loc[col1, col2]), 3)
                })
                
    # 5. Scatter Plot (sample 500 rows if size is large)
    scatter_points = []
    if x_col and y_col and x_col in df.columns and y_col in df.columns:
        # Keep only rows where both are non-null
        scatter_df = df[[x_col, y_col]].dropna()
        if len(scatter_df) > 500:
            scatter_df = scatter_df.sample(500, random_state=42)
        
        # Add a text label columns or indexes for tooltips
        for idx, row in scatter_df.iterrows():
            scatter_points.append({
                "x": float(row[x_col]),
                "y": float(row[y_col]),
                "id": int(idx)
            })
            
    return {
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "summary_stats": summary_stats,
        "histograms": histograms,
        "boxplots": boxplots,
        "heatmap": heatmap,
        "scatter": scatter_points
    }

def run_linear_regression(df: pd.DataFrame, features: list, target: str) -> dict:
    """
    Fits a linear regression model and returns performance metrics and actual vs predicted.
    """
    # Ensure correct types and drop nulls
    cols_to_use = features + [target]
    regression_df = df[cols_to_use].dropna()
    
    if len(regression_df) < 5:
        raise ValueError("Not enough data points after dropping missing values (minimum 5 required).")
        
    X = regression_df[features]
    y = regression_df[target]
    
    # Handle categorical variables in features
    X_encoded = pd.get_dummies(X, drop_first=True)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X_encoded, y, test_size=0.2, random_state=42
    )
    
    model = LinearRegression()
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    
    # Calculate metrics
    mae = mean_absolute_error(y_test, y_pred)
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, y_pred)
    
    # Get coefficients
    coef_map = {}
    for col, coef in zip(X_encoded.columns, model.coef_):
        coef_map[col] = float(coef)
    intercept = float(model.intercept_)
    
    # Comparison data for plotting actual vs predicted
    comparison = []
    # Sort test index or just zip
    y_test_vals = y_test.values
    for act, pred in zip(y_test_vals, y_pred):
        comparison.append({
            "actual": float(act),
            "predicted": float(pred),
            "residual": float(act - pred)
        })
        
    # Return top 100 actual vs predicted points to avoid huge payload
    if len(comparison) > 200:
        # Sample points to show distribution
        np.random.seed(42)
        idx = np.random.choice(len(comparison), 200, replace=False)
        comparison_sampled = [comparison[i] for i in idx]
    else:
        comparison_sampled = comparison
        
    return {
        "mae": round(float(mae), 4),
        "mse": round(float(mse), 4),
        "rmse": round(float(rmse), 4),
        "r2_score": round(float(r2), 4),
        "coefficients": coef_map,
        "intercept": intercept,
        "comparison": comparison_sampled,
        "data_points_used": len(regression_df)
    }

def run_logistic_regression(df: pd.DataFrame, features: list, target: str) -> dict:
    """
    Fits a logistic regression model on a binary target and returns evaluation metrics.
    """
    cols_to_use = features + [target]
    classification_df = df[cols_to_use].dropna()
    
    if len(classification_df) < 10:
        raise ValueError("Not enough data points after dropping missing values (minimum 10 required).")
        
    X = classification_df[features]
    y = classification_df[target]
    
    # Encode binary target if it's text/categorical
    y_encoder = LabelEncoder()
    y_encoded = y_encoder.fit_transform(y.astype(str))
    
    unique_classes = np.unique(y_encoded)
    if len(unique_classes) != 2:
        raise ValueError(f"Target column must have exactly 2 classes. Found {len(unique_classes)} classes: {list(y_encoder.classes_)}.")
        
    # Handle features encoding
    X_encoded = pd.get_dummies(X, drop_first=True)
    
    # Check if stratification is possible
    unique_classes, class_counts = np.unique(y_encoded, return_counts=True)
    can_stratify = (class_counts >= 2).all() and len(unique_classes) > 1 and len(classification_df) > len(unique_classes)
    
    if can_stratify:
        X_train, X_test, y_train, y_test = train_test_split(
            X_encoded, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
        )
    else:
        X_train, X_test, y_train, y_test = train_test_split(
            X_encoded, y_encoded, test_size=0.2, random_state=42
        )
    
    # Scale features to prevent convergence issues
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    model = LogisticRegression(max_iter=1000)
    model.fit(X_train_scaled, y_train)
    
    y_pred = model.predict(X_test_scaled)
    y_prob = model.predict_proba(X_test_scaled)[:, 1] # Probability of positive class
    
    # Compute metrics
    acc = accuracy_score(y_test, y_pred)
    precision, recall, f1, support = precision_recall_fscore_support(y_test, y_pred, average='binary')
    
    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()
    
    # Build detailed classification report text
    report = classification_report(y_test, y_pred, target_names=[str(c) for c in y_encoder.classes_], output_dict=True)
    
    # Format comparison points
    comparison = []
    for act, pred, prob in zip(y_test, y_pred, y_prob):
        comparison.append({
            "actual": int(act),
            "actual_label": str(y_encoder.classes_[act]),
            "predicted": int(pred),
            "predicted_label": str(y_encoder.classes_[pred]),
            "probability": float(prob)
        })
        
    if len(comparison) > 200:
        np.random.seed(42)
        idx = np.random.choice(len(comparison), 200, replace=False)
        comparison_sampled = [comparison[i] for i in idx]
    else:
        comparison_sampled = comparison
        
    return {
        "accuracy": round(float(acc), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1_score": round(float(f1), 4),
        "confusion_matrix": {
            "tn": int(tn),
            "fp": int(fp),
            "fn": int(fn),
            "tp": int(tp)
        },
        "classification_report": report,
        "classes": [str(c) for c in y_encoder.classes_],
        "comparison": comparison_sampled,
        "data_points_used": len(classification_df)
    }

def run_kmeans_clustering(df: pd.DataFrame, features: list, k_max: int = 10, k_selected: int = 3) -> dict:
    """
    Runs K-Means clustering. Computes elbow method inertias and silhouette scores,
    and returns 2D coordinates projected via PCA for cluster visualization.
    """
    clustering_df = df[features].dropna()
    
    if len(clustering_df) < k_selected or len(clustering_df) < 5:
        raise ValueError("Not enough data points after dropping missing values.")
        
    X = pd.get_dummies(clustering_df, drop_first=True)
    
    # Scale features for K-Means (vital step!)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # 1. Elbow Method data
    elbow_data = []
    # Cap k_max to dataset length
    actual_k_max = min(k_max, len(clustering_df) - 1)
    if actual_k_max < 2:
        actual_k_max = 2
        
    for k in range(1, actual_k_max + 1):
        km = KMeans(n_clusters=k, random_state=42, n_init='auto')
        km.fit(X_scaled)
        elbow_data.append({
            "k": k,
            "inertia": float(km.inertia_)
        })
        
    # 2. Fit selected k K-Means
    km_selected = KMeans(n_clusters=k_selected, random_state=42, n_init='auto')
    labels = km_selected.fit_predict(X_scaled)
    
    # Silhouette score (requires at least 2 clusters and less than dataset length)
    silhouette = 0.0
    if k_selected > 1 and len(clustering_df) > k_selected:
        from sklearn.metrics import silhouette_score
        silhouette = float(silhouette_score(X_scaled, labels))
        
    # 3. PCA Projection to 2D for plotting
    pca = PCA(n_components=2)
    X_projected = pca.fit_transform(X_scaled)
    explained_variance = [float(ev) for ev in pca.explained_variance_ratio_]
    
    points = []
    for idx, (coords, label) in enumerate(zip(X_projected, labels)):
        # Sample points to keep payload responsive (max 500 points)
        points.append({
            "pc1": float(coords[0]),
            "pc2": float(coords[1]),
            "cluster": int(label),
            "original_index": int(clustering_df.index[idx])
        })
        
    if len(points) > 500:
        # Sample points while maintaining class distributions (stratified sampling)
        np.random.seed(42)
        # Select indices
        indices = np.arange(len(points))
        # Stratify by cluster label
        sampled_indices = []
        for cluster_id in range(k_selected):
            cluster_indices = indices[np.array(labels) == cluster_id]
            if len(cluster_indices) > 0:
                sample_size = max(1, int(500 * (len(cluster_indices) / len(points))))
                sampled_indices.extend(np.random.choice(cluster_indices, size=min(sample_size, len(cluster_indices)), replace=False))
        points_sampled = [points[i] for i in sorted(sampled_indices)]
    else:
        points_sampled = points
        
    # Return centers
    centers_2d = pca.transform(km_selected.cluster_centers_)
    centers_data = []
    for i, c in enumerate(centers_2d):
        centers_data.append({
            "pc1": float(c[0]),
            "pc2": float(c[1]),
            "cluster": i
        })
        
    # Calculate cluster summaries (mean of original features grouped by cluster label)
    clustering_df_with_labels = clustering_df.copy()
    clustering_df_with_labels["Cluster"] = labels
    cluster_means = clustering_df_with_labels.groupby("Cluster").mean().replace({np.nan: None})
    
    summaries = []
    for c_id in range(k_selected):
        if c_id in cluster_means.index:
            row = cluster_means.loc[c_id]
            summaries.append({
                "cluster": int(c_id),
                "means": {col: float(row[col]) if row[col] is not None else 0.0 for col in clustering_df.columns}
            })

    return {
        "elbow_data": elbow_data,
        "silhouette_score": round(silhouette, 4),
        "cluster_centers_2d": centers_data,
        "points": points_sampled,
        "explained_variance": explained_variance,
        "cluster_summaries": summaries,
        "data_points_used": len(clustering_df)
    }

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Applies the complete feature engineering pipeline from the notebook.
    Creates 20 engineered features.
    """
    fe_df = df.copy()
    
    # 1. Carbon Category (if target column exists)
    if "Carbon_Footprint_tCO2e_Target" in fe_df.columns:
        fe_df["Carbon_Category"] = pd.cut(
            fe_df["Carbon_Footprint_tCO2e_Target"],
            bins=[0, 3.5, 5.5, 10],
            labels=["Low", "Medium", "High"]
        )
        fe_df["Carbon_Category"] = fe_df["Carbon_Category"].astype(str)

    # Helper conditions
    has_renew = "Renewable_Energy" in fe_df.columns
    has_recycle = "Recycling_Habit" in fe_df.columns
    
    # 2. Eco Lifestyle Score
    trees_col = "Trees_Planted_Per_Year" if "Trees_Planted_Per_Year" in fe_df.columns else 0
    renew_term = (fe_df["Renewable_Energy"] == "Yes") * 20 if has_renew else 0
    recycle_term = (fe_df["Recycling_Habit"] == "Always") * 15 if has_recycle else 0
    fe_df["Eco_Lifestyle_Score"] = (fe_df[trees_col] * 2 if isinstance(trees_col, str) else 0) + renew_term + recycle_term

    # 3. Energy Efficiency Index
    if "Green_Score" in fe_df.columns and "Electricity_kWh_Month" in fe_df.columns:
        electricity = fe_df["Electricity_kWh_Month"].replace(0, 1)
        fe_df["Energy_Efficiency_Index"] = fe_df["Green_Score"] / electricity
    else:
        fe_df["Energy_Efficiency_Index"] = 0.0

    # 4. Transport Impact Score
    if "Daily_Travel_km" in fe_df.columns and "Flights_Per_Year" in fe_df.columns:
        fe_df["Transport_Impact_Score"] = fe_df["Daily_Travel_km"] * (fe_df["Flights_Per_Year"] + 1)
    else:
        fe_df["Transport_Impact_Score"] = 0.0

    # 5. Waste Management Score
    if "Plastic_Items_Week" in fe_df.columns and "Waste_Generated_kg_Week" in fe_df.columns:
        fe_df["Waste_Management_Score"] = fe_df["Plastic_Items_Week"] + fe_df["Waste_Generated_kg_Week"] * 5
    else:
        fe_df["Waste_Management_Score"] = 0.0

    # 6. Sustainability Index
    green_score = fe_df["Green_Score"] if "Green_Score" in fe_df.columns else 0
    trees = fe_df["Trees_Planted_Per_Year"] if "Trees_Planted_Per_Year" in fe_df.columns else 0
    travel = fe_df["Daily_Travel_km"] if "Daily_Travel_km" in fe_df.columns else 0
    electricity = fe_df["Electricity_kWh_Month"] if "Electricity_kWh_Month" in fe_df.columns else 0
    fe_df["Sustainability_Index"] = green_score + trees - travel - (electricity / 10)

    # 7. Digital Lifestyle Score
    if "Internet_Hours_Day" in fe_df.columns and "Screen_Time_Hours" in fe_df.columns:
        fe_df["Digital_Lifestyle_Score"] = fe_df["Internet_Hours_Day"] + fe_df["Screen_Time_Hours"]
    else:
        fe_df["Digital_Lifestyle_Score"] = 0.0

    # 8. Resource Consumption Index
    if "Electricity_kWh_Month" in fe_df.columns and "Water_Consumption_L_Day" in fe_df.columns:
        fe_df["Resource_Consumption_Index"] = fe_df["Electricity_kWh_Month"] + fe_df["Water_Consumption_L_Day"]
    else:
        fe_df["Resource_Consumption_Index"] = 0.0

    # 9. Environmental Awareness
    recycle_term_aw = (fe_df["Recycling_Habit"] == "Always") * 25 if has_recycle else 0
    renew_term_aw = (fe_df["Renewable_Energy"] == "Yes") * 25 if has_renew else 0
    trees_aw = fe_df["Trees_Planted_Per_Year"] if "Trees_Planted_Per_Year" in fe_df.columns else 0
    fe_df["Environmental_Awareness"] = recycle_term_aw + renew_term_aw + trees_aw

    # 10. Family Carbon Index
    if "Carbon_Footprint_tCO2e_Target" in fe_df.columns and "Household_Size" in fe_df.columns:
        hsize = fe_df["Household_Size"].replace(0, 1)
        fe_df["Family_Carbon_Index"] = fe_df["Carbon_Footprint_tCO2e_Target"] / hsize
    else:
        fe_df["Family_Carbon_Index"] = 0.0

    # 11. Diet Sustainability Score
    diet_score = {
        "Vegan": 10,
        "Vegetarian": 8,
        "Eggetarian": 6,
        "Non-Vegetarian": 3
    }
    if "Diet" in fe_df.columns:
        fe_df["Diet_Sustainability_Score"] = fe_df["Diet"].map(diet_score).fillna(5)
    else:
        fe_df["Diet_Sustainability_Score"] = 5.0

    # 12. Transportation Emission Score
    transport_score = {
        "Walk": 1,
        "Cycle": 2,
        "Public": 4,
        "Mixed": 6,
        "Private": 10
    }
    if "Transport_Mode" in fe_df.columns:
        fe_df["Transportation_Emission_Score"] = fe_df["Transport_Mode"].map(transport_score).fillna(5)
    else:
        fe_df["Transportation_Emission_Score"] = 5.0

    # 13. Vehicle Eco Score
    vehicle_score = {
        "None": 10,
        "Bicycle": 10,
        "Bus": 8,
        "EV": 9,
        "Bike": 5,
        "Car": 3
    }
    if "Vehicle_Type" in fe_df.columns:
        fe_df["Vehicle_Eco_Score"] = fe_df["Vehicle_Type"].map(vehicle_score).fillna(5)
    else:
        fe_df["Vehicle_Eco_Score"] = 5.0

    # 14. Household Energy Intensity
    if "Electricity_kWh_Month" in fe_df.columns and "Household_Size" in fe_df.columns:
        hsize = fe_df["Household_Size"].replace(0, 1)
        fe_df["Household_Energy_Intensity"] = fe_df["Electricity_kWh_Month"] / hsize
    else:
        fe_df["Household_Energy_Intensity"] = 0.0

    # 15. Carbon Reduction Potential
    elec = fe_df["Electricity_kWh_Month"] if "Electricity_kWh_Month" in fe_df.columns else 0
    trav = fe_df["Daily_Travel_km"] if "Daily_Travel_km" in fe_df.columns else 0
    plas = fe_df["Plastic_Items_Week"] if "Plastic_Items_Week" in fe_df.columns else 0
    fe_df["Carbon_Reduction_Potential"] = elec * 0.25 + trav * 0.40 + plas * 0.35

    # 16. Water Efficiency Score
    if "Water_Consumption_L_Day" in fe_df.columns:
        fe_df["Water_Efficiency_Score"] = (100 - (fe_df["Water_Consumption_L_Day"] / 10)).clip(0, 100)
    else:
        fe_df["Water_Efficiency_Score"] = 50.0

    # 17. Digital Carbon Index
    if "Internet_Hours_Day" in fe_df.columns and "Screen_Time_Hours" in fe_df.columns:
        fe_df["Digital_Carbon_Index"] = fe_df["Internet_Hours_Day"] * 0.4 + fe_df["Screen_Time_Hours"] * 0.6
    else:
        fe_df["Digital_Carbon_Index"] = 0.0

    # 18. Lifestyle Risk Score
    smoke = (fe_df["Smoking"] == "Yes") * 20 if "Smoking" in fe_df.columns else 0
    alc = (fe_df["Alcohol"] == "Yes") * 15 if "Alcohol" in fe_df.columns else 0
    plastic = fe_df["Plastic_Items_Week"] if "Plastic_Items_Week" in fe_df.columns else 0
    fe_df["Lifestyle_Risk_Score"] = smoke + alc + plastic

    # 19. Green Citizen Score
    diet_s = fe_df["Diet_Sustainability_Score"]
    veh_s = fe_df["Vehicle_Eco_Score"]
    env_aw = fe_df["Environmental_Awareness"]
    gscore = fe_df["Green_Score"] if "Green_Score" in fe_df.columns else 0
    fe_df["Green_Citizen_Score"] = gscore + diet_s + veh_s + env_aw

    # 20. Overall Sustainability Rating
    fe_df["Overall_Sustainability_Rating"] = pd.cut(
        fe_df["Green_Citizen_Score"],
        bins=[0, 80, 120, 200],
        labels=["Bronze", "Silver", "Gold"]
    )
    fe_df["Overall_Sustainability_Rating"] = fe_df["Overall_Sustainability_Rating"].astype(str)

    return fe_df

def run_feature_selection(df: pd.DataFrame, features: list, target: str, method: str = "random_forest", k: int = 20) -> dict:
    """
    Identifies key features using various selection methods: random_forest, select_k_best, rfe, or variance_threshold.
    """
    df_clean = df[features + [target]].dropna()
    if len(df_clean) < 5:
        raise ValueError("Not enough data points after dropping missing values (minimum 5 required).")
        
    X = df_clean[features]
    y = df_clean[target]
    
    X_encoded = pd.get_dummies(X, drop_first=True)
    
    selected_cols = []
    scores = {}
    
    if method == "random_forest":
        rf = RandomForestRegressor(n_estimators=100, random_state=42)
        rf.fit(X_encoded, y)
        importances = rf.feature_importances_
        sorted_indices = np.argsort(importances)[::-1]
        for idx in sorted_indices[:k]:
            col_name = X_encoded.columns[idx]
            selected_cols.append(col_name)
            scores[col_name] = float(importances[idx])
            
    elif method == "select_k_best":
        k_val = min(k, X_encoded.shape[1])
        selector = SelectKBest(score_func=f_regression, k=k_val)
        selector.fit(X_encoded, y)
        scores_arr = selector.scores_
        scores_arr = np.nan_to_num(scores_arr)
        sorted_indices = np.argsort(scores_arr)[::-1]
        for idx in sorted_indices[:k_val]:
            col_name = X_encoded.columns[idx]
            selected_cols.append(col_name)
            scores[col_name] = float(scores_arr[idx])
            
    elif method == "rfe":
        k_val = min(k, X_encoded.shape[1])
        rfe = RFE(estimator=DecisionTreeRegressor(random_state=42), n_features_to_select=k_val, step=5)
        rfe.fit(X_encoded, y)
        for idx, rank in enumerate(rfe.ranking_):
            col_name = X_encoded.columns[idx]
            scores[col_name] = int(rank)
            if rank == 1:
                selected_cols.append(col_name)
        selected_cols = sorted(selected_cols, key=lambda c: scores[c])
        
    elif method == "variance_threshold":
        selector = VarianceThreshold(threshold=0.01)
        selector.fit(X_encoded)
        variances = selector.variances_
        support = selector.get_support()
        for idx, sup in enumerate(support):
            col_name = X_encoded.columns[idx]
            scores[col_name] = float(variances[idx])
            if sup:
                selected_cols.append(col_name)
        selected_cols = sorted(selected_cols, key=lambda c: scores[c], reverse=True)[:k]
        
    else:
        raise ValueError(f"Unknown feature selection method: {method}")
        
    return {
        "method": method,
        "selected_features": selected_cols,
        "scores": scores,
        "total_encoded_features": X_encoded.shape[1]
    }

def run_pca_analysis(df: pd.DataFrame, features: list) -> dict:
    """
    Fits PCA on numerical features and returns explained variance, components, and 2D projections.
    """
    df_clean = df[features].dropna()
    if len(df_clean) < 2:
        raise ValueError("Not enough data points to run PCA.")
        
    X = pd.get_dummies(df_clean, drop_first=True)
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    pca = PCA()
    X_projected = pca.fit_transform(X_scaled)
    
    explained_variance = [float(ev) for ev in pca.explained_variance_ratio_]
    cumulative_variance = [float(cv) for cv in np.cumsum(pca.explained_variance_ratio_)]
    
    n_comps = min(5, len(pca.components_))
    components_loadings = []
    for i in range(n_comps):
        loadings = {}
        for idx, col in enumerate(X.columns):
            loadings[col] = float(pca.components_[i][idx])
        components_loadings.append({
            "component": i + 1,
            "explained_variance": float(pca.explained_variance_ratio_[i]),
            "loadings": loadings
        })
        
    points = []
    sample_size = min(500, len(X_projected))
    np.random.seed(42)
    indices = np.random.choice(len(X_projected), sample_size, replace=False)
    
    for idx in sorted(indices):
        points.append({
            "pc1": float(X_projected[idx][0]),
            "pc2": float(X_projected[idx][1]) if X_projected.shape[1] > 1 else 0.0,
            "pc3": float(X_projected[idx][2]) if X_projected.shape[1] > 2 else 0.0,
            "index": int(df_clean.index[idx])
        })
        
    return {
        "explained_variance": explained_variance,
        "cumulative_variance": cumulative_variance,
        "components": components_loadings,
        "points": points,
        "features_count": X.shape[1],
        "samples_count": len(df_clean)
    }

def compare_regression_models(df: pd.DataFrame, features: list, target: str) -> dict:
    """
    Fits and compares multiple regression models on the dataset.
    """
    df_clean = df[features + [target]].dropna()
    if len(df_clean) < 10:
        raise ValueError("Not enough data points after dropping missing values (minimum 10 required).")
        
    X = df_clean[features]
    y = df_clean[target]
    
    X_encoded = pd.get_dummies(X, drop_first=True)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X_encoded, y, test_size=0.2, random_state=42
    )
    
    models = {
        "Linear Regression": LinearRegression(),
        "Ridge Regression": Ridge(alpha=1.0),
        "Lasso Regression": Lasso(alpha=0.01),
        "Decision Tree": DecisionTreeRegressor(random_state=42),
        "Random Forest": RandomForestRegressor(n_estimators=100, random_state=42),
        "Gradient Boosting": GradientBoostingRegressor(random_state=42)
    }
    
    results = []
    best_model_name = None
    best_r2 = -999.0
    
    for name, model in models.items():
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        
        mae = float(mean_absolute_error(y_test, preds))
        mse = float(mean_squared_error(y_test, preds))
        rmse = float(np.sqrt(mse))
        r2 = float(r2_score(y_test, preds))
        
        cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring="r2")
        cv_mean = float(cv_scores.mean())
        
        results.append({
            "model": name,
            "mae": round(mae, 4),
            "mse": round(mse, 4),
            "rmse": round(rmse, 4),
            "r2_score": round(r2, 4),
            "cv_r2_mean": round(cv_mean, 4)
        })
        
        if r2 > best_r2:
            best_r2 = r2
            best_model_name = name
            
    results = sorted(results, key=lambda x: x["r2_score"], reverse=True)
    
    return {
        "results": results,
        "best_model": best_model_name,
        "best_r2_score": round(best_r2, 4),
        "data_points_used": len(df_clean)
    }

def compare_classification_models(df: pd.DataFrame, features: list, target: str) -> dict:
    """
    Fits and compares multiple classification models. If target is numerical, it bins it first.
    """
    df_clean = df.copy()
    
    if df_clean[target].dtype in [np.float64, np.int64] and df_clean[target].nunique() > 10:
        df_clean["Carbon_Category_Binned"] = pd.cut(
            df_clean[target],
            bins=[0, 3.5, 5.5, 10],
            labels=["Low", "Medium", "High"]
        )
        df_clean["Carbon_Category_Binned"] = df_clean["Carbon_Category_Binned"].fillna("High")
        clf_target = "Carbon_Category_Binned"
    else:
        clf_target = target
        
    df_clean = df_clean[features + [clf_target]].dropna()
    if len(df_clean) < 10:
        raise ValueError("Not enough data points after dropping missing values (minimum 10 required).")
        
    X = df_clean[features]
    y = df_clean[clf_target]
    
    le = LabelEncoder()
    y_encoded = le.fit_transform(y.astype(str))
    
    X_encoded = pd.get_dummies(X, drop_first=True)
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_encoded)
    
    # Check if stratification is possible
    unique_classes, class_counts = np.unique(y_encoded, return_counts=True)
    can_stratify = (class_counts >= 2).all() and len(unique_classes) > 1 and len(df_clean) > len(unique_classes)
    
    if can_stratify:
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
        )
    else:
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y_encoded, test_size=0.2, random_state=42
        )
    
    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000),
        "Decision Tree": DecisionTreeClassifier(random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
        "KNN": KNeighborsClassifier(),
        "Naive Bayes": GaussianNB(),
        "SVM": SVC(probability=True),
        "Gradient Boosting": GradientBoostingClassifier(random_state=42)
    }
    
    results = []
    best_model_name = None
    best_accuracy = -1.0
    
    for name, model in models.items():
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        
        acc = float(accuracy_score(y_test, preds))
        prec = float(precision_score(y_test, preds, average="weighted", zero_division=0))
        rec = float(recall_score(y_test, preds, average="weighted", zero_division=0))
        f1 = float(f1_score(y_test, preds, average="weighted", zero_division=0))
        
        results.append({
            "model": name,
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4)
        })
        
        if acc > best_accuracy:
            best_accuracy = acc
            best_model_name = name
            
    results = sorted(results, key=lambda x: x["accuracy"], reverse=True)
    
    return {
        "results": results,
        "best_model": best_model_name,
        "best_accuracy": round(best_accuracy, 4),
        "classes": [str(c) for c in le.classes_],
        "data_points_used": len(df_clean)
    }

def run_ann_regression(df: pd.DataFrame, features: list, target: str, epochs: int = 100, batch_size: int = 32) -> dict:
    """
    Fits a Deep Learning Artificial Neural Network (ANN) model using TensorFlow.
    """
    try:
        import tensorflow as tf
        from tensorflow.keras.models import Sequential
        from tensorflow.keras.layers import Input, Dense, Dropout
        from tensorflow.keras.callbacks import EarlyStopping
    except ImportError:
        raise ImportError(
            "TensorFlow is not installed in the current python environment. "
            "Please install tensorflow (pip install tensorflow) to run deep learning regression."
        )
        
    df_clean = df[features + [target]].dropna()
    if len(df_clean) < 10:
        raise ValueError("Not enough data points after dropping missing values (minimum 10 required).")
        
    X = df_clean[features]
    y = df_clean[target]
    
    X_encoded = pd.get_dummies(X, drop_first=True)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X_encoded, y, test_size=0.2, random_state=42
    )
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    model = Sequential([
        Input(shape=(X_train_scaled.shape[1],)),
        Dense(128, activation='relu'),
        Dropout(0.2),
        Dense(64, activation='relu'),
        Dropout(0.2),
        Dense(32, activation='relu'),
        Dense(1)
    ])
    
    model.compile(
        optimizer='adam',
        loss='mse',
        metrics=['mae']
    )
    
    early_stop = EarlyStopping(
        monitor='val_loss',
        patience=10,
        restore_best_weights=True
    )
    
    history = model.fit(
        X_train_scaled,
        y_train,
        validation_split=0.2,
        epochs=epochs,
        batch_size=batch_size,
        callbacks=[early_stop],
        verbose=0
    )
    
    y_pred = model.predict(X_test_scaled).flatten()
    
    mae = float(mean_absolute_error(y_test, y_pred))
    mse = float(mean_squared_error(y_test, y_pred))
    rmse = float(np.sqrt(mse))
    r2 = float(r2_score(y_test, y_pred))
    
    history_loss = [float(x) for x in history.history['loss']]
    history_val_loss = [float(x) for x in history.history['val_loss']]
    history_mae = [float(x) for x in history.history.get('mae', [])]
    history_val_mae = [float(x) for x in history.history.get('val_mae', [])]
    
    model_path = os.path.join(os.getcwd(), "ann_model.keras")
    model.save(model_path)
    
    return {
        "mae": round(mae, 4),
        "mse": round(mse, 4),
        "rmse": round(rmse, 4),
        "r2_score": round(r2, 4),
        "training_loss": history_loss,
        "validation_loss": history_val_loss,
        "training_mae": history_mae,
        "validation_mae": history_val_mae,
        "saved_model_path": model_path,
        "data_points_used": len(df_clean)
    }

def generate_sustainability_report(user_data: dict) -> dict:
    """
    Computes sustainability grade, carbon level, and rule-based tips for a user profile.
    """
    target_val = float(user_data.get("Carbon_Footprint_tCO2e_Target", 0.0))
    if target_val < 3.5:
        c_level = "🟢 Low"
    elif target_val < 5.5:
        c_level = "🟡 Medium"
    else:
        c_level = "🔴 High"
        
    green_score = float(user_data.get("Green_Score", 0.0))
    if green_score >= 90:
        grade = "A+"
    elif green_score >= 80:
        grade = "A"
    elif green_score >= 70:
        grade = "B"
    elif green_score >= 60:
        grade = "C"
    else:
        grade = "D"
        
    recommendations = []
    if float(user_data.get("Electricity_kWh_Month", 0.0)) > 300:
        recommendations.append("Reduce electricity consumption by using LED bulbs and energy-efficient appliances.")
    if float(user_data.get("Daily_Travel_km", 0.0)) > 25:
        recommendations.append("Use public transport, cycling, or carpooling whenever possible.")
    if float(user_data.get("Plastic_Items_Week", 0.0)) > 15:
        recommendations.append("Reduce single-use plastic and switch to reusable alternatives.")
    if float(user_data.get("Water_Consumption_L_Day", 0.0)) > 500:
        recommendations.append("Save water by fixing leaks and using water-efficient fixtures.")
    if str(user_data.get("Diet")) == "Non-Vegetarian":
        recommendations.append("Include more plant-based meals to reduce carbon emissions.")
    if str(user_data.get("Renewable_Energy")) == "No":
        recommendations.append("Consider using renewable energy such as solar power.")
    if float(user_data.get("Trees_Planted_Per_Year", 0.0)) < 5:
        recommendations.append("Plant more trees to offset your carbon footprint.")
    if green_score < 70:
        recommendations.append("Improve your daily sustainable habits to increase your Green Score.")
        
    return {
        "carbon_footprint": target_val,
        "carbon_level": c_level,
        "green_score": green_score,
        "sustainability_grade": grade,
        "recommendations": recommendations
    }

def generate_ai_report(user_data: dict, api_key: str = None) -> dict:
    """
    Generates a professional sustainability report using the Gemini API client.
    """
    try:
        from google import genai
    except ImportError:
        raise ImportError(
            "google-genai is not installed in the python environment. "
            "Please run pip install google-genai."
        )
        
    effective_api_key = api_key or os.environ.get("GEMINI_API_KEY")
    if not effective_api_key:
        raise ValueError("Gemini API key is missing. Please set the GEMINI_API_KEY environment variable or provide it in the request.")
        
    try:
        client = genai.Client(api_key=effective_api_key)
    except Exception as e:
        raise ValueError(f"Failed to initialize GenAI client with API key: {str(e)}")
        
    prompt = f"""
You are EcoHub AI, an expert Environmental Sustainability Consultant, Climate Analyst, and Green Lifestyle Advisor.

Your responsibility is to analyze the user's environmental lifestyle and generate a professional sustainability assessment report.

========================
USER PROFILE
========================

Age : {user_data.get('Age', 'N/A')}
Gender : {user_data.get('Gender', 'N/A')}
Occupation : {user_data.get('Occupation', 'N/A')}
Education : {user_data.get('Education', 'N/A')}

Diet : {user_data.get('Diet', 'N/A')}
Transport Mode : {user_data.get('Transport_Mode', 'N/A')}
Daily Travel : {user_data.get('Daily_Travel_km', 'N/A')} km/day
Flights Per Year : {user_data.get('Flights_Per_Year', 'N/A')}

Electricity Usage : {user_data.get('Electricity_kWh_Month', 'N/A')} kWh/month
Water Consumption : {user_data.get('Water_Consumption_L_Day', 'N/A')} liters/day
Internet Usage : {user_data.get('Internet_Hours_Day', 'N/A')} hours/day
Screen Time : {user_data.get('Screen_Time_Hours', 'N/A')} hours/day

Waste Generated : {user_data.get('Waste_Generated_kg_Week', 'N/A')} kg/week
Plastic Items : {user_data.get('Plastic_Items_Week', 'N/A')} items/week
Recycling Habit : {user_data.get('Recycling_Habit', 'N/A')}
Renewable Energy : {user_data.get('Renewable_Energy', 'N/A')}

Trees Planted : {user_data.get('Trees_Planted_Per_Year', 'N/A')}
Household Size : {user_data.get('Household_Size', 'N/A')}

Green Score : {user_data.get('Green_Score', 'N/A')}

Predicted Carbon Footprint :
{user_data.get('Carbon_Footprint_tCO2e_Target', 'N/A')} tCO2e/year

========================

Generate a detailed professional report using the following format.

# \ud83c\udf0d EcoHub AI Sustainability Report

## 1. Executive Summary
Provide a concise overview of the user's sustainability performance.

---

## 2. Sustainability Analysis
Analyze the user's lifestyle, highlighting strengths and weaknesses.

---

## 3. Carbon Footprint Assessment

Include:
\u2022 Carbon Footprint Value
\u2022 Green Score
\u2022 Sustainability Level
\u2022 Overall Environmental Performance

---

## 4. AI Insights

Explain:
\u2022 Biggest contributor to carbon emissions
\u2022 Best sustainability habit
\u2022 Environmental risks
\u2022 Long-term impact

---

## 5. Top 5 Personalized Recommendations

Provide five practical recommendations.
For each recommendation include:
\u2714 Recommendation
\u2714 Reason
\u2714 Expected Benefit

---

## 6. Estimated Environmental Benefits

Estimate how much the user could improve by following the recommendations.
Mention improvements in:
\u2022 Carbon Emissions
\u2022 Water Saving
\u2022 Electricity Saving
\u2022 Plastic Reduction
\u2022 Sustainability Score

---

## 7. SDGs Supported

Mention only the relevant SDGs.
Explain each one in one sentence.

---

## 8. EcoHub AI Sustainability Grade

Assign one grade only: A+, A, B, C, or D.
Explain why the user received this grade.

---

## 9. EcoHub AI Carbon Risk Level

Assign one level: Low, Moderate, High, or Critical.
Explain why.

---

## 10. Sustainability Challenge

Suggest one 30-day sustainability challenge personalized for the user.
Example:
Walk instead of driving for 30 days.
Reduce electricity by 10%.
Plant 5 trees.
Avoid single-use plastic.

---

## 11. Future Prediction

Predict what will happen after one year if the user follows all recommendations.
Estimate: Carbon Footprint, Green Score, Overall Sustainability.

---

## 12. Final Motivation

Write a powerful motivational paragraph encouraging the user to continue protecting the environment.

Use a professional, positive and inspiring tone.
Generate the report in clean Markdown format with headings, bullet points and emojis where appropriate.
The report should be between 800 and 1200 words.
Do not mention that you are an AI model.
"""

    try:
        response = client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=prompt
        )
        return {
            "status": "success",
            "report_markdown": response.text
        }
    except Exception as e:
        raise ValueError(f"Gemini API generation failed: {str(e)}")

def serialize_best_models(
    df: pd.DataFrame,
    regression_features: list,
    classification_features: list,
    target: str,
    model_dir: str = "."
) -> dict:
    """
    Trains best regression and classification models and serializes them along with preprocessing objects.
    """
    os.makedirs(model_dir, exist_ok=True)
    
    # 1. Regression model: GradientBoostingRegressor
    reg_df = df[regression_features + [target]].dropna()
    X_reg = reg_df[regression_features]
    y_reg = reg_df[target]
    
    X_reg_encoded = pd.get_dummies(X_reg, drop_first=True)
    
    best_regressor = GradientBoostingRegressor(random_state=42)
    best_regressor.fit(X_reg_encoded, y_reg)
    
    reg_model_path = os.path.join(model_dir, "regression_model.pkl")
    joblib.dump(best_regressor, reg_model_path)
    
    # 2. Classification model: GradientBoostingClassifier
    clf_df = df.copy()
    clf_df["Carbon_Category"] = pd.cut(
        clf_df[target],
        bins=[0, 3.5, 5.5, 10],
        labels=["Low", "Medium", "High"]
    )
    clf_df["Carbon_Category"] = clf_df["Carbon_Category"].fillna("High")
    
    clf_df = clf_df[classification_features + ["Carbon_Category"]].dropna()
    X_clf = clf_df[classification_features]
    y_clf = clf_df["Carbon_Category"]
    
    le = LabelEncoder()
    y_clf_encoded = le.fit_transform(y_clf.astype(str))
    
    X_clf_encoded = pd.get_dummies(X_clf, drop_first=True)
    
    scaler = StandardScaler()
    X_clf_scaled = scaler.fit_transform(X_clf_encoded)
    
    best_classifier = GradientBoostingClassifier(random_state=42)
    best_classifier.fit(X_clf_scaled, y_clf_encoded)
    
    clf_model_path = os.path.join(model_dir, "classification_model.pkl")
    joblib.dump(best_classifier, clf_model_path)
    
    scaler_path = os.path.join(model_dir, "scaler.pkl")
    joblib.dump(scaler, scaler_path)
    
    le_path = os.path.join(model_dir, "label_encoder.pkl")
    joblib.dump(le, le_path)
    
    return {
        "status": "success",
        "regression_model_path": reg_model_path,
        "classification_model_path": clf_model_path,
        "scaler_path": scaler_path,
        "label_encoder_path": le_path,
        "regression_features_columns": X_reg_encoded.columns.tolist(),
        "classification_features_columns": X_clf_encoded.columns.tolist()
    }
