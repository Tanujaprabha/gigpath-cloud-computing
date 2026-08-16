# GigPath R Analytics Backend — Phase 1 Documentation

This directory contains **Phase 1** of the GigPath R Financial Analytics Integration: R backend setup, financial data management, validation, and API setup.

---

## Directory Structure

```
r_backend/
├── plumber_api.R       # Plumber REST API endpoint (POST /data-management)
├── data_management.R   # Core Data Management module (cleaning, type casting, validation)
├── test_phase1.R       # Standalone test script with real GigPath sample data
└── README.md           # Phase 1 documentation
```

---

## 1. Prerequisites & Required R Packages

Ensure R is installed on your system (e.g. R 4.x+).

The following R packages are required for the full R backend:

- `plumber` (REST API framework)
- `jsonlite` (JSON parsing and serialization)
- `dplyr` (Data manipulation)
- `tidyr` (Data tidying)
- `lubridate` (Date/time handling)
- `readr` (CSV I/O)

### Package Installation Command in R:
```R
install.packages(c("plumber", "jsonlite", "dplyr", "tidyr", "lubridate", "readr"))
```

*Note:* Base R functions in `r_backend/data_management.R` are fully self-contained and execute out-of-the-box even prior to installing external packages.

---

## 2. How to Start the R API

To start the Plumber REST API server listening on `http://localhost:8000`:

### Option A: From PowerShell / Command Line
```powershell
& "C:\Program Files\R\R-4.6.1\bin\Rscript.exe" -e "plumber::plumb('r_backend/plumber_api.R')$run(port=8000)"
```

### Option B: From R / RStudio Console
```R
library(plumber)
pr <- plumb("r_backend/plumber_api.R")
pr$run(port = 8000)
```

---

## 3. Phase 1 API Endpoint Specification

### `POST /data-management`

Validates, cleans, and structures incoming Firebase financial datasets from the React application.

#### Request JSON Format:
```json
{
  "transactions": [
    {
      "id": "tx-101",
      "uid": "usr_123",
      "title": "Uber Airport Run",
      "amount": 210.00,
      "type": "income",
      "category": "categories.rideShare",
      "date": "2026-05-05",
      "method": "methods.bankTransfer",
      "status": "status.cleared",
      "note": "Peak-hour multiplier lifted this shift.",
      "createdAt": "2026-05-05T14:30:00Z"
    }
  ],
  "goals": [
    {
      "id": "goal-101",
      "uid": "usr_123",
      "goalTitle": "Emergency Cushion",
      "purpose": "Cash buffer for slow demand weeks and repairs.",
      "targetAmount": 3000,
      "alreadySaved": 1650,
      "deadline": "2026-10-01",
      "monthlyContribution": 270,
      "priority": "priority.high",
      "createdAt": "2026-05-01T10:00:00Z"
    }
  ],
  "recurringExpenses": [
    {
      "id": "rec-101",
      "uid": "usr_123",
      "title": "Commercial Insurance",
      "category": "categories.insurance",
      "amount": 118,
      "nextCharge": "2026-05-11",
      "frequency": "frequency.monthly",
      "status": "status.scheduled",
      "createdAt": "2026-05-01T10:00:00Z"
    }
  ],
  "export_csv": false
}
```

#### Response JSON Format:
```json
{
  "status": "success",
  "message": "Phase 1 financial data management and validation completed successfully.",
  "record_counts": {
    "transactions_count": 1,
    "goals_count": 1,
    "recurring_count": 1
  },
  "financial_totals": {
    "total_income": 210.0,
    "total_expenses": 0.0,
    "net_cash_flow": 210.0,
    "total_goals_target": 3000.0,
    "total_goals_saved": 1650.0,
    "total_recurring_monthly": 118.0
  },
  "validation": {
    "transactions": {
      "total_records": 1,
      "valid_records": 1,
      "missing_amount": 0,
      "invalid_numeric_amount": 0,
      "invalid_dates": 0,
      "missing_type": 0,
      "unexpected_type": 0,
      "missing_category": 0,
      "duplicates": 0,
      "warnings": null
    },
    "goals": {
      "total_records": 1,
      "valid_records": 1,
      "missing_target": 0,
      "invalid_numeric_target": 0,
      "invalid_dates": 0,
      "duplicates": 0,
      "warnings": null
    },
    "recurringExpenses": {
      "total_records": 1,
      "valid_records": 1,
      "missing_amount": 0,
      "invalid_numeric_amount": 0,
      "invalid_dates": 0,
      "duplicates": 0,
      "warnings": null
    }
  },
  "timestamp": "2026-08-15T16:15:00Z"
}
```

---

## 4. How the Three Firebase Datasets are Processed

1. **Transactions (`users/{uid}/transactions`):**
   - Coerces `amount` to numeric (`double`).
   - Converts `date` string (`YYYY-MM-DD`) to Date object.
   - Validates `type` against `income` or `expense`.
   - Retains category keys (`categories.fuel`, `categories.rideShare`).
   - Identifies duplicates based on `(title, amount, type, date, uid)`.

2. **Goals (`users/{uid}/goals`):**
   - Supports both Firestore field names (`goalTitle`, `alreadySaved`) and React state field names (`title`, `savedAmount`).
   - Coerces `targetAmount`, `alreadySaved`, and `monthlyContribution` to numeric.
   - Parses `deadline` into Date format.

3. **Recurring Expenses (`users/{uid}/recurringExpenses`):**
   - Coerces `amount` to numeric.
   - Parses `nextCharge` into Date format.
   - Retains `frequency` string key (`frequency.monthly`).

---

## 5. CSV Testing & Export

For development and inspection, cleaned datasets can be exported to CSV files in `data/`:
- `data/transactions.csv`
- `data/goals.csv`
- `data/recurring_expenses.csv`

To trigger CSV export during testing:
Run the standalone script:
```powershell
& "C:\Program Files\R\R-4.6.1\bin\Rscript.exe" r_backend/test_phase1.R
```
Or pass `"export_csv": true` in the POST request payload to `/data-management`.
