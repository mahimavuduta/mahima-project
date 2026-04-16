"""
generate_dataset.py
Generates a synthetic student performance dataset and trains a Linear Regression model.
Run this once before starting the server: python generate_dataset.py
"""

import numpy as np
import pandas as pd
import pickle
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

np.random.seed(42)
N = 200

study_hours  = np.random.uniform(0, 10, N)
attendance   = np.random.uniform(30, 100, N)
sleep_hours  = np.random.uniform(4, 10, N)
revision_freq = np.random.uniform(0, 7, N)

# Marks formula: weighted combination + noise
marks = (
    5.0 * study_hours +
    0.30 * attendance +
    2.0 * sleep_hours +
    3.5 * revision_freq +
    np.random.normal(0, 5, N)
)
marks = np.clip(marks, 0, 100)

df = pd.DataFrame({
    "study_hours":   study_hours,
    "attendance":    attendance,
    "sleep_hours":   sleep_hours,
    "revision_freq": revision_freq,
    "marks":         marks
})

df.to_csv("data/student_data.csv", index=False)
print(f"Dataset saved: {len(df)} rows → data/student_data.csv")

# ── Train model ──────────────────────────────────────────────────────────────
X = df[["study_hours", "attendance", "sleep_hours", "revision_freq"]]
y = df["marks"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = LinearRegression()
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
print(f"R² Score : {r2_score(y_test, y_pred):.3f}")
print(f"RMSE     : {np.sqrt(mean_squared_error(y_test, y_pred)):.3f}")
print(f"Coefficients: {dict(zip(X.columns, model.coef_.round(3)))}")
print(f"Intercept: {model.intercept_:.3f}")

with open("model/linear_model.pkl", "wb") as f:
    pickle.dump(model, f)
print("Model saved → model/linear_model.pkl")
