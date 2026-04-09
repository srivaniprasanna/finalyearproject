"""Crop suitability using dataset and optional ML model."""

import os
from datetime import datetime
import pandas as pd
import pickle
import aiosqlite
from typing import List, Optional, Tuple
from config import DB_PATH

MODEL_PATH = os.path.join(os.path.dirname(__file__), "crop_model.pkl")
ENCODERS_PATH = os.path.join(os.path.dirname(__file__), "encoders.pkl")

_model = None
_encoders = None

DATASET_PATH = os.path.join(os.path.dirname(__file__), "dataset.csv")
_dataset_df = None

FORBIDDEN_CROP_COMPACT_KEYS = {
    "tea",
    "coffee",
    "barley",
    "sugarcane",
    "sunflower",
}


def _norm_str(x) -> str:
    return (str(x) if x is not None else "").strip()


def _norm_key(x) -> str:
    # Normalize crop/district keys so "Bapatla " and "Bapatla" match.
    return _norm_str(x).lower()


def _norm_key_compact(x) -> str:
    # Like _norm_key but also removes spaces so "blackgram" matches "black gram".
    return _norm_str(x).lower().replace(" ", "")


def _is_allowed_crop_name(crop_name: str) -> bool:
    return _norm_key_compact(crop_name) not in FORBIDDEN_CROP_COMPACT_KEYS


def _infer_season(month: int):
    # For dataset filtering we map into dataset seasons: Rabi/Kharif/Zaid (+ Annual allowed).
    if month in (4, 5):
        return "Zaid", "Summer (Pre-monsoon)", "Warm temperatures and early rains influence summer crop choices and land preparation."
    if month in (6, 7, 8, 9):
        return "Kharif", "Kharif (Monsoon)", "Monsoon season: higher rainfall supports crops suited to wet conditions."
    return "Rabi", "Rabi (Winter)", "Winter season: cooler temperatures and steadier conditions influence rabi crop suitability."


def _is_bapatla(lat: float, lon: float) -> bool:
    # Very rough bounding box for Bapatla (Andhra Pradesh).
    # Used only as fallback when district isn't provided by the frontend.
    return 15.7 <= float(lat) <= 16.2 and 79.9 <= float(lon) <= 80.8


def _load_dataset_df():
    global _dataset_df
    if _dataset_df is not None:
        return _dataset_df

    if not os.path.exists(DATASET_PATH):
        _dataset_df = None
        return None

    df = pd.read_csv(DATASET_PATH)
    df.columns = df.columns.str.strip()

    # Normalize required columns.
    df["state"] = df["State"].astype(str).str.strip()
    df["district"] = df["District"].astype(str).str.strip()
    df["crop_name"] = df["Crop_Name"].astype(str).str.strip()
    df["season"] = df["Season"].astype(str).str.strip()
    df["soil_type"] = df["Soil_Type"].astype(str).str.strip()
    df["suitable"] = df["Suitable(Y/N)"].astype(str).str.strip().str.upper()

    df["min_temp"] = pd.to_numeric(df["Min_Temperature(C)"], errors="coerce")
    df["max_temp"] = pd.to_numeric(df["Max_Temperature(C)"], errors="coerce")
    df["rainfall"] = pd.to_numeric(df["Rainfall(mm)"], errors="coerce")
    df["humidity"] = pd.to_numeric(df["Humidity(%)"], errors="coerce")

    # Keep only suitable rows.
    df = df[df["suitable"] == "Y"].copy()
    df["district_key"] = df["district"].map(_norm_key)
    df["crop_key"] = df["crop_name"].map(_norm_key)
    df["season_key"] = df["season"].map(_norm_key)

    # Remove forbidden crops from dataset-based recommendations.
    df = df[df["crop_name"].map(_is_allowed_crop_name)].copy()

    _dataset_df = df
    return _dataset_df


def _get_soil_type_from_df(df_loc: "pd.DataFrame") -> str:
    if df_loc is None or df_loc.empty:
        return "Loamy"
    vc = df_loc["soil_type"].value_counts()
    if vc.empty:
        return "Loamy"
    return str(vc.index[0])


def _get_crop_requirements_from_df(df_crop_rows: "pd.DataFrame") -> Optional[dict]:
    if df_crop_rows is None or df_crop_rows.empty:
        return None

    # Aggregate min/max across rows for that crop.
    min_t = float(df_crop_rows["min_temp"].min())
    max_t = float(df_crop_rows["max_temp"].max())
    rain_lo = float(df_crop_rows["rainfall"].min())
    rain_hi = float(df_crop_rows["rainfall"].max())
    hum_lo = float(df_crop_rows["humidity"].min())
    hum_hi = float(df_crop_rows["humidity"].max())
    soils = list(df_crop_rows["soil_type"].dropna().unique())

    # Guard against NaNs.
    if any(v != v for v in [min_t, max_t, rain_lo, rain_hi, hum_lo, hum_hi]):
        return None

    return {
        "min_temp": min_t,
        "max_temp": max_t,
        "rainfall_min": rain_lo,
        "rainfall_max": rain_hi,
        "humidity_min": hum_lo,
        "humidity_max": hum_hi,
        "soil_types": soils,
    }


def _recommend_from_dataset(
    df: "pd.DataFrame",
    *,
    state: Optional[str],
    district: Optional[str],
    temp: float,
    rainfall: float,
    humidity: float,
    soil_type: str,
    season_group: str,
    limit: int,
) -> List[str]:
    if df is None or df.empty:
        return []

    district_norm = _norm_key(district) if district else ""
    state_norm = _norm_key(state) if state else ""

    df_loc = df
    if state_norm:
        df_loc = df_loc[df_loc["state"].map(_norm_key) == state_norm]

    # If district provided and found, use it; else fallback to state-level.
    if district_norm:
        df_d = df_loc[df_loc["district"].map(_norm_key) == district_norm]
        if not df_d.empty:
            df_loc = df_d

    # Season filtering: dataset has Season values like Rabi/Kharif/Zaid/Annual.
    season_norm = _norm_key(season_group)
    annual_key = _norm_key("Annual")
    df_season = df_loc[df_loc["season"].map(_norm_key).isin([season_norm, annual_key])]
    if df_season.empty:
        df_season = df_loc

    # Score crops by how many conditions match their aggregated ranges.
    candidates = [c for c in df_season["crop_name"].unique().tolist() if _is_allowed_crop_name(c)]
    scored: List[Tuple[int, str]] = []  # (score, crop_name)

    for crop_name in candidates:
        crop_key = _norm_key(crop_name)
        crop_rows = df_season[df_season["crop_key"] == crop_key]
        req = _get_crop_requirements_from_df(crop_rows)
        if not req:
            continue

        ok_temp = req["min_temp"] <= temp <= req["max_temp"]
        ok_rain = req["rainfall_min"] <= rainfall <= req["rainfall_max"]
        ok_hum = req["humidity_min"] <= humidity <= req["humidity_max"]
        ok_soil = soil_type in req["soil_types"]

        score = int(ok_temp) + int(ok_rain) + int(ok_hum) + int(ok_soil)
        scored.append((score, crop_name))

    scored.sort(key=lambda x: (-x[0], x[1]))

    suitable = [c for s, c in scored if s == 4]
    if suitable:
        # Preserve order from score sort.
        return suitable[:limit]
    return [c for _, c in scored][:limit]


def _recommend_bapatla_override(df: "pd.DataFrame", *, state: Optional[str], limit: int) -> List[str]:
    """
    For Bapatla we return the exact crop set you requested (in the given order),
    but only if those crops exist in the CSV.
    """
    if df is None or df.empty:
        return []

    wanted_compact_keys = [
        "groundnut",
        "maize",
        "blackgram",   # matches "Black gram"
        "greengram",   # matches "Green gram"
        "ragi",
        "gongura",
        "okra",
        "greenchilli", # matches "Green chilli"
        "rice",
    ]

    df_bp = df[df["district"].map(_norm_key_compact) == _norm_key_compact("Bapatla")]
    if df_bp.empty:
        return []

    df_state = df
    if state:
        state_norm = _norm_key(state)
        df_state = df_state[df_state["state"].map(_norm_key) == state_norm]
        if df_state.empty:
            df_state = df

    # Map compact key -> first dataset crop display name (prefer Bapatla rows).
    by_key = {}
    for _, row in df_bp.iterrows():
        name = row.get("crop_name")
        if name is None:
            continue
        key = _norm_key_compact(name)
        if key not in by_key:
            by_key[key] = str(name)

    ordered = []
    for k in wanted_compact_keys:
        if k in by_key:
            ordered.append(by_key[k])
            continue
        # Fallback: if the exact crop isn't present in Bapatla rows, still include it from state-level.
        df_match = df_state[df_state["crop_name"].map(_norm_key_compact) == k]
        if not df_match.empty:
            ordered.append(str(df_match.iloc[0]["crop_name"]))
        if len(ordered) >= limit:
            break

    return ordered


async def _build_crop_explanations_from_dataset(
    df: "pd.DataFrame",
    crops: List[str],
    *,
    temp: float,
    rainfall: float,
    humidity: float,
    soil_type: str,
    season_group: str,
) -> dict:
    if df is None or df.empty:
        return {}

    season_norm = _norm_key(season_group)
    annual_key = _norm_key("Annual")
    df_season = df[df["season"].map(_norm_key).isin([season_norm, annual_key])]
    if df_season.empty:
        df_season = df

    crop_explanations = {}
    actual = {
        "temp": temp,
        "rainfall": rainfall,
        "humidity": humidity,
        "soil_type": soil_type,
    }

    for crop_name in crops:
        if not _is_allowed_crop_name(crop_name):
            continue
        crop_rows = df_season[df_season["crop_key"] == _norm_key(crop_name)]
        req = _get_crop_requirements_from_df(crop_rows)
        if not req:
            continue
        ok_temp = req["min_temp"] <= temp <= req["max_temp"]
        ok_rain = req["rainfall_min"] <= rainfall <= req["rainfall_max"]
        ok_hum = req["humidity_min"] <= humidity <= req["humidity_max"]
        ok_soil = soil_type in req["soil_types"]
        suitable = ok_temp and ok_rain and ok_hum and ok_soil
        crop_explanations[crop_name] = _build_reason_slides(crop_name, req, actual, suitable)

    return crop_explanations


def _load_model():
    global _model, _encoders
    if _model is None and os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, "rb") as f:
            _model = pickle.load(f)

        if os.path.exists(ENCODERS_PATH):
            with open(ENCODERS_PATH, "rb") as f:
                _encoders = pickle.load(f)

    return _model, _encoders


# --------------------------------------------------------
# GET CROP REQUIREMENTS
# --------------------------------------------------------

async def get_crop_requirements(crop_name: str) -> Optional[dict]:
    # Hard-block crops we don't want to recommend/suggest as suitable (avoid DB legacy rows).
    if not _is_allowed_crop_name(crop_name):
        return None

    conn = await aiosqlite.connect(DB_PATH)
    candidates = []
    conn.row_factory = aiosqlite.Row

    try:

        cur = await conn.execute(
            """
            SELECT min_temp, max_temp, rainfall, humidity, wind_speed, soil_type
            FROM crop_data
            WHERE LOWER(TRIM(crop_name)) = LOWER(TRIM(?))
            AND suitable = 'Y'
            """,
            (crop_name,),
        )

        rows = await cur.fetchall()

        if not rows:
            return None

        min_t = min(r["min_temp"] for r in rows)
        max_t = max(r["max_temp"] for r in rows)

        rain_lo = min(r["rainfall"] for r in rows)
        rain_hi = max(r["rainfall"] for r in rows)

        hum_lo = min(r["humidity"] for r in rows)
        hum_hi = max(r["humidity"] for r in rows)

        soils = list(set(r["soil_type"] for r in rows))

        return {
            "min_temp": min_t,
            "max_temp": max_t,
            "rainfall_min": rain_lo,
            "rainfall_max": rain_hi,
            "humidity_min": hum_lo,
            "humidity_max": hum_hi,
            "soil_types": soils,
        }

    finally:
        await conn.close()


# --------------------------------------------------------
# REASON SLIDES
# --------------------------------------------------------

def _build_reason_slides(crop_name: str, req: dict, actual: dict, suitable: bool) -> List[dict]:

    slides = []

    temp = actual.get("temp", 0)
    rain = actual.get("rainfall", 800)
    hum = actual.get("humidity", 60)
    soil = actual.get("soil_type", "Loamy")

    temp_ok = req["min_temp"] <= temp <= req["max_temp"]
    rain_ok = req["rainfall_min"] <= rain <= req["rainfall_max"]
    hum_ok = req["humidity_min"] <= hum <= req["humidity_max"]
    soil_ok = soil in req["soil_types"]

    slides.append({
        "title": "Temperature",
        "required": f"{req['min_temp']}°C - {req['max_temp']}°C",
        "actual": f"{temp}°C",
        "suitable": temp_ok,
        "message": "Temperature is suitable." if temp_ok else "Temperature outside ideal range."
    })

    slides.append({
        "title": "Rainfall",
        "required": f"{req['rainfall_min']} - {req['rainfall_max']} mm",
        "actual": f"{rain} mm",
        "suitable": rain_ok,
        "message": "Rainfall is suitable." if rain_ok else "Rainfall outside ideal range."
    })

    slides.append({
        "title": "Humidity",
        "required": f"{req['humidity_min']}% - {req['humidity_max']}%",
        "actual": f"{hum}%",
        "suitable": hum_ok,
        "message": "Humidity suitable." if hum_ok else "Humidity outside ideal range."
    })

    slides.append({
        "title": "Soil Type",
        "required": ", ".join(req["soil_types"]),
        "actual": soil,
        "suitable": soil_ok,
        "message": "Soil type suitable." if soil_ok else "Soil type not ideal."
    })

    return slides


# --------------------------------------------------------
# PREDICT SUITABILITY
# --------------------------------------------------------

async def predict_suitability(
    crop_name: str,
    temp: float,
    rainfall: float,
    humidity: float,
    wind_speed: float,
    soil_type: str,
) -> Tuple[bool, List[dict], List[str]]:

    req = await get_crop_requirements(crop_name)

    actual = {
        "temp": temp,
        "rainfall": rainfall,
        "humidity": humidity,
        "soil_type": soil_type,
    }

    if not req:
        return False, [], []

    suitable = (
        req["min_temp"] <= temp <= req["max_temp"]
        and req["rainfall_min"] <= rainfall <= req["rainfall_max"]
        and req["humidity_min"] <= humidity <= req["humidity_max"]
        and soil_type in req["soil_types"]
    )

    slides = _build_reason_slides(crop_name, req, actual, suitable)

    alternatives = []

    if not suitable:
        alternatives = await get_recommended_crops(temp, rainfall, humidity, soil_type)

    return suitable, slides, alternatives


# --------------------------------------------------------
# RECOMMEND CROPS
# --------------------------------------------------------

async def get_recommended_crops(
    temp: float,
    rainfall: float,
    humidity: float,
    soil_type: str,
    limit: int = 10,
) -> List[str]:

    conn = await aiosqlite.connect(DB_PATH)

    try:

        sql = """
        SELECT DISTINCT crop_name
        FROM crop_data
        WHERE suitable = 'Y'
        AND min_temp <= ?
        AND max_temp >= ?
        AND humidity <= ?
        AND humidity >= ?
        AND soil_type = ?
        LIMIT ?
        """

        candidate_limit = max(limit * 3, limit)
        params = [temp + 5, temp - 5, humidity + 20, humidity - 20, soil_type, candidate_limit]

        cur = await conn.execute(sql, params)

        rows = await cur.fetchall()

        # Keep order stable and dedupe.
        seen = set()
        candidates = []
        for r in rows:
            name = r[0]
            if not _is_allowed_crop_name(name):
                continue
            if name not in seen:
                seen.add(name)
                candidates.append(name)

    finally:
        await conn.close()

    # Validate rainfall + aggregated suitability in Python.
    suitable_crops: List[str] = []
    scored: List[Tuple[int, int, str]] = []  # (score, candidateIndex, cropName)

    for idx, crop in enumerate(candidates):
        req = await get_crop_requirements(crop)
        if not req:
            continue

        ok_temp = req["min_temp"] <= temp <= req["max_temp"]
        ok_rain = req["rainfall_min"] <= rainfall <= req["rainfall_max"]
        ok_hum = req["humidity_min"] <= humidity <= req["humidity_max"]
        ok_soil = soil_type in req["soil_types"]

        score = int(ok_temp) + int(ok_rain) + int(ok_hum) + int(ok_soil)
        scored.append((score, idx, crop))

        if ok_temp and ok_rain and ok_hum and ok_soil:
            suitable_crops.append(crop)
            if len(suitable_crops) >= limit:
                return suitable_crops[:limit]

    # Fill remaining slots with highest-scoring candidates.
    if len(suitable_crops) < limit:
        scored.sort(key=lambda x: (-x[0], x[1]))
        for _, _, crop in scored:
            if crop in suitable_crops:
                continue
            suitable_crops.append(crop)
            if len(suitable_crops) >= limit:
                break

    return suitable_crops[:limit]


# --------------------------------------------------------
# BEST CROPS FOR LOCATION (FIX FOR YOUR ERROR)
# --------------------------------------------------------

async def get_best_crops(lat: float, lon: float, state=None, district=None, limit: int = 10, include_explanations: bool = False):
    from weather import get_weather

    weather = await get_weather(lat, lon)

    temp = weather.get("temp", 25)
    humidity = weather.get("humidity", 60)
    rainfall = weather.get("rain_1h_mm", 0) * 24 * 365 if weather.get("rain_1h_mm") else 800

    month = datetime.now().month
    season_group, season, season_description = _infer_season(month)

    df = _load_dataset_df()

    # Effective district: prefer explicit district; else fallback to Bapatla bounding box.
    district_effective = district
    if not district_effective and _is_bapatla(lat, lon):
        district_effective = "Bapatla"

    # Load/derive soil from dataset (so it matches dataset.csv).
    soil_type = "Loamy"
    crop_explanations = {}
    crops: List[str] = []

    if df is not None and not df.empty:
        df_loc = df
        if state:
            state_norm = _norm_key(state)
            df_loc = df_loc[df_loc["state"].map(_norm_key) == state_norm]

        if district_effective:
            district_norm = _norm_key(district_effective)
            df_d = df_loc[df_loc["district"].map(_norm_key) == district_norm]
            if not df_d.empty:
                df_loc = df_d

        soil_type = _get_soil_type_from_df(df_loc)

        # Bapatla override to match your required crop set.
        if district_effective and _norm_key_compact(district_effective) == _norm_key_compact("Bapatla"):
            crops = _recommend_bapatla_override(df, state=state, limit=limit)
        else:
            crops = _recommend_from_dataset(
                df,
                state=state,
                district=district_effective,
                temp=temp,
                rainfall=rainfall,
                humidity=humidity,
                soil_type=soil_type,
                season_group=season_group,
                limit=limit,
            )

    # If CSV-based recommendation fails, fallback to DB/SQL recommendation.
    used_dataset = bool(crops)
    if not crops:
        crops = await get_recommended_crops(temp, rainfall, humidity, soil_type, limit)
        used_dataset = False

    if include_explanations:
        if used_dataset and df is not None and not df.empty:
            crop_explanations = await _build_crop_explanations_from_dataset(
                df,
                crops,
                temp=temp,
                rainfall=rainfall,
                humidity=humidity,
                soil_type=soil_type,
                season_group=season_group,
            )
        else:
            # Fallback explanations based on crop.db aggregated requirements.
            actual = {
                "temp": temp,
                "rainfall": rainfall,
                "humidity": humidity,
                "soil_type": soil_type,
            }
            for crop in crops:
                req = await get_crop_requirements(crop)
                if not req:
                    continue
                ok_temp = req["min_temp"] <= temp <= req["max_temp"]
                ok_rain = req["rainfall_min"] <= rainfall <= req["rainfall_max"]
                ok_hum = req["humidity_min"] <= humidity <= req["humidity_max"]
                ok_soil = soil_type in req["soil_types"]
                suitable = ok_temp and ok_rain and ok_hum and ok_soil
                crop_explanations[crop] = _build_reason_slides(crop, req, actual, suitable)

    return {
        "crops": crops,
        "crop_explanations": crop_explanations,
        "season": season,
        "season_description": season_description,
        "location_data": {
            "temperature_c": temp,
            "humidity_percent": humidity,
            "rainfall_mm": rainfall,
            "soil_type": soil_type,
        },
    }