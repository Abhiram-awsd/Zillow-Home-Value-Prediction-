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
ml-service/      Python training script and inference service
vercel.json      Vercel build and routing configuration
```

## Local development

Requirements: Node.js 20+, npm, and Python 3.10-3.13. You need three steps, the first only once.

**1. Install and train**

```bash
npm install
cp .env.example .env          # Windows: copy .env.example .env
cd ml-service
python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python train.py --download
python build_market_data.py
```

If the download fails, get the county ZHVI CSVs for 1 to 5 bedrooms from <https://www.zillow.com/research/data/> and save them in `ml-service/data/` as `1Bed_county.csv` through `5Bed_county.csv`. Then run `python train.py`.

**2. Start the model service** (keep this terminal open, inside `ml-service` with the venv active)

```bash
uvicorn main:app --port 8000
```

**3. Start the website** (in a second terminal, from the repo root)

```bash
npm run dev
```

Open <http://localhost:5173>. Express runs on port 5000 and Vite forwards `/api` to it.

## Features

- **Overview:** live national median, trend, and headline figures.
- **Explore Markets:** clickable state map by value or price change, 1-5+ bedrooms, sortable rankings, county search, and county trends.
- **Value Estimator:** estimate with its typical error, model vs Zillow trend, values by bedroom count, metro vs non-metro, and national rank.
- **Affordability:** monthly payment and income needed for any estimate.
- **Compare:** up to three scenarios on one chart and in a table.
- **Saved:** estimates kept in the browser, with CSV export.
- **Market Insights:** your model's holdout accuracy, feature importance, and the biggest five-year movers.

`build_market_data.py` only reads the CSVs, so it doesn't require retraining. Market figures are Zillow's published values with no imputation; state and national figures are medians across counties.

## The model

The app follows the [source notebook](https://github.com/manishkolla/Zillow-Home-Value-Prediction). Its inputs are **metro area, state, bedrooms, and date**, and its target is Zillow's county-level home value index. It cannot use square footage, year built, condition, or a specific address, because the data has none of them. It estimates a typical home for an area, not one property.

`train.py` differs from the notebook in three deliberate ways:

| Notebook | This project | Why |
|---|---|---|
| Multiplies every output by 4.2 (`1 + 3.2` "inflation") | No multiplier | 3.2 was meant as a percentage, so results were about four times too high |
| `prediction()` always uses Georgia | Uses the selected state | The state lookup compares against the literal `'GA'` |
| `fillna(0)` sets missing prices to $0 before imputation | State/bedroom/month median | The zeros were training data as real prices |

The Random Forests also default to 50 trees on 25% of rows per tree, against the notebook's 125-150 on all rows, to keep memory and file size manageable. Use `--n-estimators` and `--max-samples` to change this. Metrics therefore differ from the notebook's; `train.py` prints the holdout MAE, RMSE, and R² for your model.

## Deploying

Vercel hosts the website and Express API only. The trained model is too heavy for it, so deploy `ml-service/` with both files in `artifacts/` to a Python host, then set `MODEL_API_URL` in Vercel to that service's `/predict` URL.

## Environment variables

- `MODEL_API_URL`: required for predictions; unset means HTTP 503.
- `MODEL_API_TOKEN`: optional bearer token, set the same value on the API and the model service.
- `MONGODB_URI`: optional; saves successful prediction history.
- `CLIENT_ORIGIN`: optional Express CORS allow-list.
- `MODEL_PIPELINE_PATH`, `MARKET_DATA_PATH`: optional file locations for the Python service.
- `VITE_API_URL`: optional API URL if the client is hosted separately.

Dashboard sample content is illustrative and labeled as such. It is not live Zillow data. This application is an academic demonstration, not a formal appraisal service.
