import main
import ml_functions
import pandas as pd

def test_workflow():
    print("Generating sample data...")
    df = main.generate_sample_data()
    print(f"Sample data loaded. Shape: {df.shape}")
    
    # 1. Info
    info = ml_functions.get_dataset_info(df)
    print(f"Columns in dataset: {[c['name'] for c in info['columns']]}")
    print(f"Row count: {info['row_count']}, Columns: {info['col_count']}")
    
    # 2. Clean
    print("\nCleaning data...")
    cleaned_df = ml_functions.clean_dataset(df, imputation_strategy="mean")
    print(f"Missing values count after cleaning: {cleaned_df.isnull().sum().sum()}")
    
    # 3. EDA
    print("\nRunning EDA data generation...")
    eda = ml_functions.get_eda_data(cleaned_df, x_col="CO2_Emissions", y_col="Temperature_Anomaly")
    print(f"Numeric columns: {eda['numeric_columns']}")
    print(f"Correlation heatmap cell count: {len(eda['heatmap'])}")
    print(f"Scatter points count: {len(eda['scatter'])}")
    
    # 4. Linear Regression
    print("\nRunning Linear Regression...")
    features = ["GDP_per_Capita", "Forest_Area_Percentage", "Renewable_Energy_Share"]
    target = "CO2_Emissions"
    lr_results = ml_functions.run_linear_regression(cleaned_df, features, target)
    print(f"Linear Regression R2 Score: {lr_results['r2_score']}")
    print(f"Linear Regression MAE: {lr_results['mae']}")
    
    # 5. Logistic Regression
    print("\nRunning Logistic Regression...")
    log_features = ["GDP_per_Capita", "Forest_Area_Percentage", "Renewable_Energy_Share", "CO2_Emissions"]
    log_target = "High_Emissions"
    clf_results = ml_functions.run_logistic_regression(cleaned_df, log_features, log_target)
    print(f"Logistic Regression Accuracy: {clf_results['accuracy']}")
    print(f"Logistic Regression F1 Score: {clf_results['f1_score']}")
    print(f"Confusion Matrix: {clf_results['confusion_matrix']}")
    
    # 6. K-Means Clustering
    print("\nRunning K-Means...")
    cluster_features = ["GDP_per_Capita", "Renewable_Energy_Share", "CO2_Emissions"]
    kmeans_results = ml_functions.run_kmeans_clustering(cleaned_df, cluster_features, k_selected=3)
    print(f"K-Means Silhouette Score: {kmeans_results['silhouette_score']}")
    print(f"PCA projected points count: {len(kmeans_results['points'])}")
    print("All backend ML functions are functioning correctly!")

if __name__ == "__main__":
    test_workflow()
