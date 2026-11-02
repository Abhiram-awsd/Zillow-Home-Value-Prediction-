# Zillow Home Value Prediction

A responsive full-stack academic project built around a public Zillow housing-value research notebook.

## Stack

- **Frontend:** React 18, Vite, Recharts, Lucide
- **API:** Node.js, Express
- **Inference adapter:** Python, FastAPI, scikit-learn, pandas, joblib
- **Optional persistence:** MongoDB / Mongoose
- **Deployment:** Vercel (React static build + Express serverless API)

## Repository layout

```
client/          React application
server/          Express API and optional MongoDB history
api/             Vercel serverless API entry point
ml-service/      Python inference adapter
docs/            Model integration notes and verified schema
vercel.json      Vercel build and routing configuration
```

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

The Vite client runs on `http://localhost:5173`; Express runs on `http://localhost:5000`. Set `VITE_API_URL=http://localhost:5000/api` in `client/.env` if you want to override the default local API path.

## Model integration status



The API therefore fails closed with HTTP 503 until `MODEL_API_URL` points to an inference service wrapping the original fitted preprocessing + estimator pipeline. The Python adapter in `ml-service/` loads a joblib pipeline only when an audited feature list is supplied. Do not train a replacement model on guessed features or return a formula-based mock estimate.

Before enabling predictions:
1. Inspect the upstream notebook and identify its target, feature columns, units, geography/time granularity, preprocessing, and final estimator.
2. Export the fitted preprocessing and estimator together as one reproducible scikit-learn pipeline.
3. Set `MODEL_PIPELINE_PATH` and `MODEL_FEATURES_JSON` in the Python service; deploy that service separately.
4. Set `MODEL_API_URL` in the Vercel project to the service's `/predict` endpoint.
5. Validate predictions against known notebook examples and document MAE/RMSE/R² from the original evaluation.

## Environment variables

- `MODEL_API_URL`: required for actual predictions; unset means HTTP 503.
- `MODEL_API_TOKEN`: optional bearer token for the inference service.
- `MONGODB_URI`: optional; saves successful prediction history.
- `CLIENT_ORIGIN`: optional Express CORS allow-list.
- `MODEL_PIPELINE_PATH`, `MODEL_FEATURES_JSON`, `MODEL_VERSION`: Python inference service configuration.

Dashboard sample content is illustrative and labeled as such. It is not live Zillow data. This application is an academic demonstration, not a formal appraisal service.
