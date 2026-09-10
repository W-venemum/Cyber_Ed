# Assessment Auditor — Frontend

React + TypeScript + Vite single-page app (Tailwind CSS v4) for the SIH 2026
"Assessment Auditor" prototype. It is a thin presentation layer over the FastAPI
backend: every diagnostic score, blind spot, candidate ranking, and improvement
delta is fetched from the API and rendered as-is. No diagnostic math is done in
the browser.

## Screens / routes

| Route | Screen |
| --- | --- |
| `/` | Dashboard (demo assessment + audit summary cards + CTA) |
| `/assessments` | Assessments list |
| `/assessments/:id` | Assessment detail (item list with diagnostic power) |
| `/items/:id` | Item Auditor (three-column: question/responses, mapping, power/blind spot, Explain/Why) |
| `/items/:id/repair` | Repair Recommendation (ranked candidates, best separator, Apply Repair → before/after) |
| `/misconceptions` | Misconception Map (State / Name / Description / Typical response / Mapped options) |
| `/about` | About / Method (audit → explain → repair, JSD formula, thresholds, limitations) |

## Configuration

The backend base URL is read from `import.meta.env.VITE_API_BASE_URL` and
defaults to `http://localhost:8000` when unset.

```bash
cp .env.example .env   # then edit VITE_API_BASE_URL if the backend is elsewhere
```

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
```

Start the backend first (from `../backend`): `uvicorn app.main:app` on port 8000.
CORS on the backend allows `http://localhost:5173` by default.

## Build

```bash
npm run build      # tsc -b && vite build — must pass with zero type errors
npm run preview    # serve the production build
```

## Demo path (2–3 minutes)

Dashboard → open the Fraction Addition Diagnostic Quiz → item **Q3** → observe
the *Illustrative demo responses* and **LOW** diagnostic power with the **M2 vs
M4** blind spot → open **Explain / Why?** → **Find strongest repair** → the
engine highlights **Q8** ("1/3 + 1/4 = ?") as the best separator → **Apply
Repair** → see the predicted **before → after** improvement (0.38 LOW → 0.73
HIGH).

All figures are heuristic prototype estimates, not psychometric certification.
