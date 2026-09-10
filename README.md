# Assessment Auditor

> **Audit the assessment, not only the learner.**

**Team:** Cyber Sentinels · **Event:** Smart India Hackathon (SIH) 2026 · **Problem Statement:** PS 26207 · **Theme:** AICTE / Smart Education

Assessment Auditor is a deterministic, explainable diagnostic engine (FastAPI backend) with a React/TypeScript/Vite/Tailwind frontend. It inspects each quiz item and asks a different question from the usual one: not *"did the student get it right?"* but *"can this item actually tell competing misconceptions apart?"*

---

## Table of contents

- [1. Problem](#1-problem)
- [2. Proposed solution](#2-proposed-solution)
- [3. Why raw score is insufficient](#3-why-raw-score-is-insufficient)
- [4. Misconception mapping](#4-misconception-mapping)
- [5. Diagnostic power (HIGH / MEDIUM / LOW)](#5-diagnostic-power-high--medium--low)
- [6. Separability formula (Jensen-Shannon divergence)](#6-separability-formula-jensen-shannon-divergence)
- [7. Candidate repair ranking](#7-candidate-repair-ranking)
- [8. Why this is deterministic](#8-why-this-is-deterministic)
- [9. Why no database is needed](#9-why-no-database-is-needed)
- [10. Prototype limitations](#10-prototype-limitations)
- [11. Future scale-up possibilities (NOW / NEXT / LATER)](#11-future-scale-up-possibilities-now--next--later)
- [Project structure](#project-structure)
- [Running locally](#running-locally)
- [API endpoints](#api-endpoints)
- [Engine functions](#engine-functions)
- [Sample screenshots](#sample-screenshots)
- [Known Limitations](#known-limitations)
- [SIH judge demo script (13 steps)](#sih-judge-demo-script-13-steps)

---

## 1. Problem

Classroom quizzes are usually graded on a single axis: correct or incorrect. That tells a teacher *how many* students missed a question, but not *why*. Two students can pick the same wrong answer for completely different reasons, and two different wrong reasons can collapse onto the same option. When that happens, the item cannot distinguish between competing misconceptions: it is a **diagnostic blind spot**. Teachers rarely have a way to detect these blind spots, so remediation is aimed at a score rather than at the underlying misunderstanding.

## 2. Proposed solution

Assessment Auditor treats the **assessment itself** as the object under test. For each item it models the plausible misconception states a learner could be in, derives the answer distribution each state would produce, and measures how well the item **separates** those states. Items that cannot separate their target misconceptions are flagged, explained, and paired with a ranked list of **repair candidates** (alternative items that separate the confused states better). The teacher gets a clear before/after view of diagnostic quality.

## 3. Why raw score is insufficient

A raw score compresses everything into one number. Consider the demo item **Q3 (`1/2 + 1/4 = ?`)**: a student holding the *denominator-addition* misconception (M2) and a student making a *procedure error* (M4) can land on answers that look almost identical in the observed response distribution. The item has plenty of wrong answers, but those wrong answers do not tell M2 and M4 apart. The score says "many students failed"; it cannot say "and here is which misconception each failure points to." Auditing the item exposes exactly this gap.

## 4. Misconception mapping

Each item's target misconception states are represented as probability distributions over the answer options. The prototype's fractions domain models four states:

| ID | Name | What the learner is doing |
| -- | ---- | ------------------------- |
| **M1** | **Mastery** | Correct reasoning: finds a common denominator, converts both fractions, adds only the numerators. |
| **M2** | **Denominator-addition** | Adds numerators together and denominators together: `a/b + c/d = (a+c)/(b+d)`. |
| **M3** | **Numerator-addition** | Keeps a denominator but adds numerators without finding a common denominator (or mishandles the numerator/denominator relationship). |
| **M4** | **Procedure error** | Attempts a valid strategy (e.g. common denominators) but slips on a step such as scaling, producing a result that can look similar to the M2 answer. |

## 5. Diagnostic power (HIGH / MEDIUM / LOW)

Every item receives an **overall separability** score in `[0, 1]` and is placed in a diagnostic-power band. The bands are **heuristic demo thresholds**, defined in `backend/app/data/config.json` (not hardcoded in engine logic) so they can be tuned per domain:

| Band | Rule | Meaning |
| ---- | ---- | ------- |
| **HIGH** | `overall_separability >= 0.70` | The item cleanly distinguishes its target misconceptions. |
| **MEDIUM** | `0.40 <= overall_separability < 0.70` | Partial separation; some state pairs remain ambiguous. |
| **LOW** | `overall_separability < 0.40` | Diagnostic blind spot: competing misconceptions are hard to tell apart. |

In the demo assessment, **Q1** is HIGH (~0.716), **Q2** is MEDIUM (~0.427), and **Q3** is LOW (~0.377) - its weakest pair is **M2 vs M4** at ~0.0099, i.e. those two states are nearly indistinguishable on Q3.

## 6. Separability formula (Jensen-Shannon divergence)

Separability between two misconception states is the **Jensen-Shannon divergence (JSD)** between their answer-option probability distributions, computed with **log base 2** so the result is symmetric and bounded in **`[0, 1]`**.

For two distributions `P` and `Q` over the answer options:

```
M   = (P + Q) / 2
JSD = 0.5 * KL(P || M) + 0.5 * KL(Q || M)
```

where `KL(X || Y) = sum_i X_i * log2(X_i / Y_i)` is the Kullback-Leibler divergence (terms with `X_i = 0` contribute 0). Using the midpoint `M` makes JSD symmetric (`JSD(P, Q) == JSD(Q, P)`) and, with log base 2, keeps it within `[0, 1]`: `0` means the two states are indistinguishable on this item, `1` means the item separates them perfectly.

The item's **`overall_separability`** is the **equal-weight (unweighted arithmetic) mean of the pairwise JSD values across every target-state pair** of the item. All state pairs contribute equally; no pair is weighted more heavily than another.

## 7. Candidate repair ranking

When an item scores LOW (or otherwise fails to separate the states you care about), the engine evaluates a pool of **candidate repair items**. Each candidate is scored with the same JSD-based `overall_separability`, then ranked. The engine reports the current item's separability and band, the score/band each candidate would achieve, and the **improvement** (delta) each one offers, so the recommendation is fully explainable rather than a black-box suggestion.

For the demo, the best repair for **Q3** is **Q8 (`1/3 + 1/4 = ?`)** at ~0.727 (**HIGH**), an improvement of about **+0.349** over Q3's ~0.377. Applying it shows a clear **BEFORE → AFTER** jump in diagnostic power.

## 8. Why this is deterministic

There is **no LLM, no AI service call, and no randomness** anywhere in the diagnostic path. Given the same item, misconception distributions, and thresholds, the engine returns exactly the same numbers every time. All values shown in the UI are computed by the Python engine (`backend/app/engine/`) and returned over the API; the frontend never fakes or recomputes a diagnostic score. This makes the tool auditable, reproducible, and easy for judges (and teachers) to reason about.

## 9. Why no database is needed

The prototype's domain knowledge (assessment, misconception states, response mappings, repair candidates, illustrative demo response counts, and thresholds) is small, curated, and read-only. It lives as JSON files under `backend/app/data/` and is loaded into memory at startup. There is no user data to persist, no authentication, and no write-heavy workload, so a database would add operational weight without benefit at this stage. Applying a repair updates an **in-memory** copy of the assessment only; nothing is written to disk.

## 10. Prototype limitations

This is an MVP built for a hackathon walkthrough. The misconception mappings are **curated by hand**, the response distributions are **illustrative demo data**, and the separability thresholds are **heuristic**. The engine measures how well an item *separates modeled misconception states* - it does **not** establish a student's true cognitive state, and it has **not** undergone psychometric validation. See [Known Limitations](#known-limitations) for the full list.

## 11. Future scale-up possibilities (NOW / NEXT / LATER)

- **NOW** - Deterministic JSD engine over curated fractions data; per-item diagnostic power, blind-spot detection, ranked repair candidates, and a 7-screen React UI. Single domain, in-memory JSON, no persistence.
- **NEXT** - Author more domains and richer misconception libraries; let teachers upload their own items and response data; calibrate thresholds empirically per domain; add persistence (a database) and export/reporting once real data volume justifies it.
- **LATER** - Empirically validated misconception models drawn from real classroom responses; integration with LMS / item banks; adaptive quiz assembly that maximizes diagnostic power; teacher analytics across cohorts. Any such deployment would require empirical validation before diagnostic claims are made.

---

## Project structure

```
Assessment-Auditor/
├── README.md
├── .gitignore
├── .env.example
├── backend/                      # FastAPI + deterministic diagnostic engine (Python 3.11)
│   ├── app/
│   │   ├── main.py               # FastAPI app, CORS, startup data load
│   │   ├── data_store.py         # Loads/serves the JSON demo data in memory
│   │   ├── api/
│   │   │   └── routes.py          # REST routes mounted under /api
│   │   ├── models/
│   │   │   ├── domain.py          # Domain models (Assessment, items, states, mappings, candidates)
│   │   │   └── schemas.py         # API response schemas (audits, analysis, recommendations)
│   │   ├── engine/
│   │   │   ├── separability.py    # KL / Jensen-Shannon divergence (log base 2)
│   │   │   ├── diagnostics.py     # analyze_item, blind spots, repair scoring/recommendation
│   │   │   └── config.py          # Loads heuristic thresholds
│   │   └── data/
│   │       ├── assessment.json    # Demo assessment (fractions-demo)
│   │       ├── states.json        # Misconception states M1-M4
│   │       ├── mappings.json      # Per-item misconception → option distributions
│   │       ├── candidates.json    # Candidate repair items
│   │       ├── responses.json     # Illustrative demo response counts
│   │       └── config.json        # Heuristic separability thresholds
│   ├── tests/                     # pytest suite (test_separability, test_diagnostics, test_api)
│   ├── pytest.ini
│   └── requirements.txt
└── frontend/                     # Vite + React + TypeScript + Tailwind v4
    ├── src/
    │   ├── App.tsx                # Routes (Dashboard, Assessments, Item Auditor, Repair, Map, About)
    │   ├── main.tsx
    │   ├── api/client.ts          # Fetch wrapper (uses VITE_API_BASE_URL)
    │   ├── types/index.ts
    │   ├── hooks/useApi.ts
    │   ├── components/            # Card, DistributionBars, Feedback, Layout, PowerBadge
    │   └── pages/                 # Dashboard, Assessments, AssessmentDetail, ItemAuditor,
    │                              #   RepairRecommendation, MisconceptionMap, About
    ├── index.html
    ├── package.json
    └── .env.example
```

## Running locally

You need **Python 3.11** and **Node.js** on your PATH. Run the two servers in **separate terminals**; the frontend talks to the backend through `VITE_API_BASE_URL` (default `http://localhost:8000`), and the backend allows the Vite dev origin via `CORS_ALLOW_ORIGINS` (default `http://localhost:5173`).

### Backend (FastAPI)

**macOS / Linux**

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Windows (PowerShell)**

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API is then available at `http://localhost:8000` (interactive docs at `http://localhost:8000/docs`).

Run the backend tests (24 tests) with:

```bash
pytest
```

### Frontend (Vite + React)

**macOS / Linux**

```bash
cd frontend
npm install
npm run dev
```

**Windows (PowerShell)**

```powershell
cd frontend
npm install
npm run dev
```

The Vite dev server starts at `http://localhost:5173`. Open that URL in your browser with the backend already running.

## API endpoints

All routes are mounted under `/api`:

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET` | `/api/health` | Service health check. |
| `GET` | `/api/states` | List misconception states (M1-M4). |
| `GET` | `/api/assessments` | List assessments with audit summary (blind-spot counts). |
| `GET` | `/api/assessments/{id}` | Fetch a single assessment and its items. |
| `GET` | `/api/assessments/{id}/audit` | Full audit: per-item separability, power bands, weakest pairs. |
| `GET` | `/api/items/{id}/audit` | Diagnostic analysis for one item (separability, blind spots, observed distribution). |
| `GET` | `/api/items/{id}/candidates` | Ranked repair candidates for an item, with predicted separability. |
| `GET` | `/api/items/{id}/mappings` | Misconception → answer-option distributions for an item. |
| `POST` | `/api/items/{id}/apply-repair` | Apply a repair candidate and return the BEFORE → AFTER comparison. |

## Engine functions

The diagnostic logic lives in `backend/app/engine/` and is exercised directly by the pytest suite:

- **`analyze_item`** - full diagnostic analysis for one item (pairwise separations, overall separability, power band, weakest pair, blind spots).
- **`calculate_pairwise_separability`** - JSD between two misconception states on an item.
- **`calculate_item_diagnostic_power`** - maps an overall separability score to a HIGH / MEDIUM / LOW band.
- **`find_blind_spots`** - identifies state pairs the item fails to separate.
- **`score_candidate_repairs`** - scores each candidate repair item's separability.
- **`recommend_best_repair`** - ranks candidates and returns the best repair with its improvement over the current item.

## Sample screenshots

_Screenshots to be added._

| Screen | Preview |
| ------ | ------- |
| Dashboard | _placeholder_ |
| Assessment detail | _placeholder_ |
| Item Auditor (LOW power / blind spot) | _placeholder_ |
| Repair Recommendation (BEFORE → AFTER) | _placeholder_ |
| Misconception Map | _placeholder_ |

## Known Limitations

This is a prototype/MVP. Please read these limitations before drawing conclusions from its output:

- **Misconception mappings are curated for the MVP** - hand-authored for the fractions domain, not derived from data.
- **Response distributions are prototype/demo data** - the observed response counts are illustrative, not real classroom results.
- **Separability thresholds are heuristic** - the HIGH / MEDIUM / LOW cut-offs are chosen for the walkthrough and are not calibrated psychometric values.
- **No psychometric validation has been performed** - the models and thresholds have not been statistically validated.
- **The system does not establish a student's true cognitive state** - it measures how well an item separates *modeled* misconception states, nothing more.
- **Real deployment requires empirical validation** - mappings, distributions, and thresholds must be validated against real data before any operational use.
- **The prototype is limited to the fractions domain** - a single demo assessment (fraction addition).

Improvements reported by the tool (e.g. a repair item's higher separability) are **model-based estimates on demo data**, not empirically proven, guaranteed, or validated outcomes.

## SIH judge demo script (13 steps)

A concise path to demonstrate the full value story end to end:

1. **Dashboard** - open the app; note the assessment overview and blind-spot summary.
2. Open the **Fraction Addition Diagnostic Quiz** (the `fractions-demo` assessment).
3. Navigate to **Q3** (`1/2 + 1/4 = ?`).
4. Show the **raw responses** - many students are wrong, but the score alone does not explain why.
5. Point out the **LOW** diagnostic power band for Q3.
6. Highlight the **M2 vs M4 blind spot** - the weakest pair (~0.0099): denominator-addition and procedure error are nearly indistinguishable on this item.
7. Read the **explanation** - why this item cannot separate those misconceptions.
8. Open the **candidate repairs** for Q3.
9. **Select the best separator** - the top-ranked candidate.
10. See that it is **Q8** (`1/3 + 1/4 = ?`).
11. Note the **predicted separation** - ~0.727 (HIGH), an improvement of about +0.349.
12. **Apply the repair.**
13. Review the **BEFORE → AFTER** comparison - Q3's LOW power replaced by Q8's HIGH power.
