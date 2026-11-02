"""Fail-closed inference adapter. Configure only after auditing the upstream notebook."""
import json, os
from pathlib import Path
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException

app=FastAPI(title="Zillow Model Inference",version="0.1.0")
PIPELINE_PATH=os.getenv("MODEL_PIPELINE_PATH","artifacts/zillow_pipeline.joblib")
FEATURES=os.getenv("MODEL_FEATURES_JSON","")
pipeline=None
feature_names=[]
@app.on_event("startup")
def load_model():
    global pipeline,feature_names
    if FEATURES:
        try: feature_names=json.loads(FEATURES)
        except Exception as exc: raise RuntimeError("MODEL_FEATURES_JSON must be a JSON array") from exc
    path=Path(PIPELINE_PATH)
    if path.exists() and feature_names:
        pipeline=joblib.load(path)
@app.get("/health")
def health():
    return {"status":"ok","modelLoaded":pipeline is not None,"featureCount":len(feature_names)}
@app.post("/predict")
def predict(payload: dict):
    if pipeline is None or not feature_names:
        raise HTTPException(status_code=503,detail="Model artifact and audited feature list are not configured. Export the original notebook's fitted preprocessing + estimator pipeline first.")
    missing=[name for name in feature_names if name not in payload]
    if missing: raise HTTPException(status_code=400,detail=f"Missing model features: {', '.join(missing)}")
    try:
        frame=pd.DataFrame([{name:payload[name] for name in feature_names}],columns=feature_names)
        value=float(pipeline.predict(frame)[0])
    except Exception as exc:
        raise HTTPException(status_code=422,detail=f"Model input rejected: {exc}") from exc
    if not pd.notna(value): raise HTTPException(status_code=502,detail="Model produced a non-finite output")
    return {"predictedValue":value,"currency":"USD","modelVersion":os.getenv("MODEL_VERSION","notebook-pipeline-v1")}
