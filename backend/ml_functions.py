import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.cluster import KMeans
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix, classification_report
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder
from sklearn.decomposition import PCA
import json

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

def clean_dataset(df: pd.DataFrame, imputation_strategy: str = "mean", scale_features: bool = False) -> pd.DataFrame:
    """
    Performs data cleaning: imputes nulls and optionally scales numerical columns.
    """
    cleaned_df = df.copy()
    
    # Handle numeric columns
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
            
    # Handle non-numeric columns
    categorical_cols = cleaned_df.select_dtypes(exclude=[np.number]).columns
    for col in categorical_cols:
        if cleaned_df[col].isnull().sum() > 0:
            # Impute with most frequent
            fill_val = cleaned_df[col].mode().iloc[0] if not cleaned_df[col].mode().empty else "Unknown"
            cleaned_df[col] = cleaned_df[col].fillna(fill_val)
            
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
    
    X_train, X_test, y_train, y_test = train_test_split(
        X_encoded, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    
    model = LogisticRegression(max_iter=1000)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1] # Probability of positive class
    
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
        
    return {
        "elbow_data": elbow_data,
        "silhouette_score": round(silhouette, 4),
        "cluster_centers_2d": centers_data,
        "points": points_sampled,
        "explained_variance": explained_variance,
        "data_points_used": len(clustering_df)
    }
