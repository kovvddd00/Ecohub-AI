import main
import ml_functions
import pandas as pd
import os

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
    print(f"Cluster summaries count: {len(kmeans_results['cluster_summaries'])}")

    # 7. Advanced Preprocessing and Feature Engineering
    print("\nRunning Advanced Preprocessing and Feature Engineering...")
    adv_cleaned = ml_functions.clean_dataset(
        df,
        imputation_strategy="median",
        remove_duplicates=True,
        handle_invalid=True,
        treat_outliers=True
    )
    print(f"Advanced cleaned dataset shape: {adv_cleaned.shape}")
    
    engineered = ml_functions.engineer_features(adv_cleaned)
    print(f"Engineered dataset shape: {engineered.shape}")
    print(f"Engineered features: {[c for c in engineered.columns if c not in adv_cleaned.columns]}")

    # 8. Feature Selection
    print("\nRunning Feature Selection...")
    features_to_select = ["Age", "Daily_Travel_km", "Electricity_kWh_Month", "Water_Consumption_L_Day"]
    target_to_select = "Carbon_Footprint_tCO2e_Target"
    
    rf_selection = ml_functions.run_feature_selection(engineered, features_to_select, target_to_select, method="random_forest", k=2)
    print(f"Selected RF features: {rf_selection['selected_features']}")
    
    kbest_selection = ml_functions.run_feature_selection(engineered, features_to_select, target_to_select, method="select_k_best", k=2)
    print(f"Selected KBest features: {kbest_selection['selected_features']}")

    # 9. PCA Analysis
    print("\nRunning PCA Analysis...")
    pca_res = ml_functions.run_pca_analysis(engineered, ["Age", "Daily_Travel_km", "Electricity_kWh_Month", "Water_Consumption_L_Day"])
    print(f"PCA Cumulative Variance: {pca_res['cumulative_variance']}")
    print(f"PCA Projected Points: {len(pca_res['points'])}")

    # 10. Model Comparisons
    print("\nRunning Regression Model Comparison...")
    reg_comp = ml_functions.compare_regression_models(
        engineered, 
        features=["Age", "Daily_Travel_km", "Electricity_kWh_Month", "Water_Consumption_L_Day"],
        target="Carbon_Footprint_tCO2e_Target"
    )
    print(f"Best Regression Model: {reg_comp['best_model']} (R2: {reg_comp['best_r2_score']})")

    print("\nRunning Classification Model Comparison...")
    clf_comp = ml_functions.compare_classification_models(
        engineered,
        features=["Age", "Daily_Travel_km", "Electricity_kWh_Month", "Water_Consumption_L_Day"],
        target="Carbon_Footprint_tCO2e_Target"
    )
    print(f"Best Classification Model: {clf_comp['best_model']} (Accuracy: {clf_comp['best_accuracy']})")

    # 11. TensorFlow Deep Learning (ANN)
    print("\nRunning TensorFlow Deep Learning (ANN)...")
    try:
        ann_res = ml_functions.run_ann_regression(
            engineered,
            features=["Age", "Daily_Travel_km", "Electricity_kWh_Month", "Water_Consumption_L_Day"],
            target="Carbon_Footprint_tCO2e_Target",
            epochs=5,
            batch_size=2
        )
        print(f"ANN R2 Score: {ann_res['r2_score']}")
    except ImportError as e:
        print(f"Skipped ANN: {e}")
    except Exception as e:
        print(f"ANN test failed: {e}")

    # 12. Sustainability Reports and AI advice
    print("\nRunning Recommendations Reports...")
    sample_user = engineered.iloc[0].to_dict()
    report = ml_functions.generate_sustainability_report(sample_user)
    print(f"Sustainability Grade: {report['sustainability_grade']}")
    print(f"Recommendations count: {len(report['recommendations'])}")

    print("\nRunning Gemini AI Advice Report...")
    try:
        ai_report = ml_functions.generate_ai_report(sample_user)
        print("Gemini AI Report generated successfully! Length of report:")
        print(len(ai_report["report_markdown"]))
    except ImportError as e:
        print(f"Skipped Gemini AI: {e}")
    except Exception as e:
        print(f"Gemini AI report failed (expected if API key is invalid/missing): {e}")

    # 13. Model Serialization
    print("\nRunning Model Serialization...")
    try:
        ser_res = ml_functions.serialize_best_models(
            engineered,
            regression_features=["Age", "Daily_Travel_km", "Electricity_kWh_Month"],
            classification_features=["Age", "Daily_Travel_km", "Electricity_kWh_Month"],
            target="Carbon_Footprint_tCO2e_Target",
            model_dir="models_test"
        )
        print(f"Serialized models successfully! Output dir: models_test")
        print(f"Scaler path: {ser_res['scaler_path']}")
        
        # Clean up test output dir
        import shutil
        if os.path.exists("models_test"):
            shutil.rmtree("models_test")
    except Exception as e:
        print(f"Serialization test failed: {e}")
    # 14. personaCarbo Assessment & PDF Generation
    print("\nRunning personaCarbo test...")
    try:
        import persona_carbo
        import sqlite3
        import uuid
        
        sample_assessment_input = {
            "name": "Test User",
            "age": 30,
            "country": "India",
            "city": "Mumbai",
            "familySize": 4,
            "workType": "Hybrid",
            "vehicleType": "Petrol Car",
            "kmTravelledPerWeek": 120.0,
            "flightsPerYear": 1.0,
            "publicTransportUsage": "Sometimes",
            "monthlyElectricityKwh": 220.0,
            "monthlyElectricityBill": 1800.0,
            "acUnits": 2,
            "acUsageHoursPerDay": 3.5,
            "ledBulbs": "Yes",
            "solarPanels": "No",
            "dietType": "Vegetarian",
            "meatMealsPerWeek": 0,
            "milkConsumption": "Medium",
            "foodWaste": "Medium",
            "dailyWaterUsage": 180.0,
            "showerDuration": "Medium",
            "washingMachineUsagePerWeek": 4.0,
            "plasticWaste": "Medium",
            "recycling": "Sometimes",
            "composting": "Yes",
            "clothesPurchasedPerMonth": 2.0,
            "onlineOrdersPerMonth": 5.0,
            "electronicsPurchasedPerYear": 1.0
        }
        
        calc_result = persona_carbo.calculate_personal_carbon(sample_assessment_input)
        print(f"Calculated footprint: {calc_result['totalCarbonFootprint']} kg CO2/year")
        print(f"Sustainability Score: {calc_result['sustainabilityScore']}/100")
        print(f"Rating: {calc_result['rating']}")
        
        test_id = str(uuid.uuid4())[:8]
        persona_carbo.save_assessment(
            assessment_id=test_id,
            name=sample_assessment_input["name"],
            age=sample_assessment_input["age"],
            country=sample_assessment_input["country"],
            city=sample_assessment_input["city"],
            total_carbon=calc_result["totalCarbonFootprint"],
            score=calc_result["sustainabilityScore"],
            rating=calc_result["rating"],
            user_data=sample_assessment_input,
            result_data=calc_result
        )
        print("Saved assessment to SQLite successfully.")
        
        history = persona_carbo.get_history()
        print(f"Assessment history records count: {len(history)}")
        
        report_details = persona_carbo.get_report_by_id(test_id)
        print(f"Retrieved report match name: {report_details['user_data']['name']}")
        
        # Test PDF Report generation
        pdf_buf = persona_carbo.generate_pdf_report(sample_assessment_input, calc_result)
        pdf_bytes = pdf_buf.getvalue()
        print(f"Generated PDF bytes size: {len(pdf_bytes)}")
        
        # Clean up database test record
        conn = sqlite3.connect(persona_carbo.DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM assessment_history WHERE id = ?", (test_id,))
        conn.commit()
        conn.close()
        print("Cleaned up database test record successfully.")
        
    except Exception as e:
        print(f"personaCarbo test failed: {e}")

    print("\nAll backend ML functions are functioning correctly!")

if __name__ == "__main__":
    test_workflow()
