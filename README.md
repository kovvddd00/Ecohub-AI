# EcoHub AI - Sustainability ML Platform

EcoHub AI is a clean, modern web application designed to run machine learning workflows (Data Cleaning, EDA, Linear Regression, Logistic Regression, and K-Means Clustering) directly on sustainability and environmental datasets. 

The application utilizes a **FastAPI (Python)** backend for core mathematical calculations and scikit-learn models, paired with a responsive, glassmorphic **React (TypeScript) + Tailwind CSS** frontend that renders interactive data plots via **Recharts**.

---

## Workspace Structure

- `backend/`: FastAPI server and scikit-learn models
  - `main.py`: Entry point and REST endpoints (`/api/upload`, `/api/clean`, `/api/eda`, etc.)
  - `ml_functions.py`: Mathematical computations, regression fits, and cluster projection logic
  - `requirements.txt`: Python package requirements
- `frontend/`: React + TypeScript frontend
  - `src/context/AppContext.tsx`: Global react context sharing dataset states and training runs
  - `src/pages/`: Modular page files (Home, Upload, EDA, LinearRegression, LogisticRegression, KMeans, Results)
  - `src/components/`: Layout structures (Sidebar, Header)
  - `src/index.css`: Design tokens, dark/light theme, and custom glassmorphism styles

---

## How to Run

### 1. Start the Python Backend
Prerequisites: Python 3.11+

1. Open a new terminal in the `backend/` directory:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the development server:
   ```bash
   python main.py
   ```
   The backend server will launch at `http://127.0.0.1:8000`.

### 2. Start the React Frontend
Prerequisites: Node.js v20+

1. Open a new terminal in the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Run the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will launch at `http://localhost:5173`. Open this URL in your web browser.

---

## Features Walkthrough

1. **Dashboard Overview**: Access quick summaries of features or click **Use Sample Dataset** to generate and load a realistic carbon emissions tracking dataset instantly.
2. **Dataset Center**: Review rows, column count, null percentage distributions, and browse scrollable data rows. Clean your dataset with a selected strategy (Mean, Median, or Mode imputation).
3. **Exploratory EDA**: Toggle interactively between a column histogram, box plot quartile distributions with highlighted outlier counts, a coordinate scatter plot, and a visually color-scaled Pearson correlation heatmap matrix.
4. **Linear Regression**: Configure target and indicators, fit a scikit-learn model, retrieve continuous error metrics ($R^2$, MAE, RMSE), visual mathematical model equations, and actual vs predicted scatter mappings.
5. **Logistic Regression**: Train classification targets on binary features to get accuracy metrics, a visual $2\times 2$ Confusion Matrix grid, and a full class precision/recall report.
6. **K-Means Clustering**: Find the ideal clustering count using the Elbow method, fit clusters, evaluate silhouette scores, and view PCA-reduced data groups color-coded by cluster identity.
7. **Model History**: Automatically saves regression and classification training results across pages for side-by-side session comparisons.
