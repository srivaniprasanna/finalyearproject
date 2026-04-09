import pandas as pd
import sqlite3
import os

from config import DB_PATH

DATASET_PATH = os.path.join(os.path.dirname(__file__), "dataset.csv")


def load_dataset():

    print("Looking for dataset at:", DATASET_PATH)

    if not os.path.exists(DATASET_PATH):
        print("❌ dataset.csv not found.")
        return

    # Read dataset
    df = pd.read_csv(DATASET_PATH)

    # Remove spaces in column names
    df.columns = df.columns.str.strip()

    # Rename columns to clean names (handle various CSV formats)
    rename_map = {
        "Crop": "crop_name",
        "crop": "crop_name",
        "Crop_Name": "crop_name",
        "min_temperature(c)": "min_temp",
        "max_temperature(c)": "max_temp",
        "Min_Temperature(C)": "min_temp",
        "Max_Temperature(C)": "max_temp",
        "rainfall(mm)": "rainfall",
        "Rainfall(mm)": "rainfall",
        "humidity(%)": "humidity",
        "Humidity(%)": "humidity",
        "wind_speed(km/h)": "wind_speed",
        "Wind_Speed(km/h)": "wind_speed",
        "Suitable(Y/N)": "suitable",
        "Soil_Type": "soil_type",
    }
    df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns}, inplace=True)

    # Clean suitable column
    df["suitable"] = df["suitable"].astype(str).str.strip().str.upper()

    # Convert numeric columns
    numeric_cols = [
        "min_temp",
        "max_temp",
        "rainfall",
        "humidity",
        "wind_speed"
    ]

    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Remove crops that we don't want to suggest in the UI.
    forbidden_compact = {
        "tea",
        "coffee",
        "barley",
        "sugarcane",
        "sunflower",
    }

    if "crop_name" in df.columns:
        crop_compact = df["crop_name"].astype(str).str.lower().str.strip().str.replace(" ", "", regex=False)
        df = df[~crop_compact.isin(forbidden_compact)].copy()

    conn = sqlite3.connect(DB_PATH)

    df.to_sql(
        "crop_data",
        conn,
        if_exists="replace",
        index=False
    )

    conn.commit()
    conn.close()

    print("Dataset loaded successfully into database")


if __name__ == "__main__":
    load_dataset()