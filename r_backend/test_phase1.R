# ==============================================================================
# Phase 1 Test Script — Real GigPath Sample Data Test
# ==============================================================================
# File: r_backend/test_phase1.R
# Purpose: Test data_management.R with actual GigPath project financial sample 
#          data and verify CSV generation and validation summary generation.
# ==============================================================================

source("r_backend/data_management.R")

# Actual sample financial datasets from GigPath project schema
sample_transactions <- list(
  list(
    id = "tx-101",
    title = "Uber Airport Run",
    amount = 210,
    type = "income",
    category = "categories.rideShare",
    date = "2026-05-05",
    status = "status.cleared",
    method = "methods.bankTransfer",
    note = "Peak-hour multiplier lifted this shift.",
    uid = "test_user_001"
  ),
  list(
    id = "tx-102",
    title = "DoorDash Lunch Rush",
    amount = 124,
    type = "income",
    category = "categories.delivery",
    date = "2026-05-04",
    status = "status.cleared",
    method = "methods.walletTransfer",
    note = "Strong lunch demand near downtown offices.",
    uid = "test_user_001"
  ),
  list(
    id = "tx-103",
    title = "Fuel Top-Up",
    amount = 48,
    type = "expense",
    category = "categories.fuel",
    date = "2026-05-04",
    status = "status.paid",
    method = "methods.card",
    note = "Full tank before airport queue window.",
    uid = "test_user_001"
  ),
  list(
    id = "tx-104",
    title = "Mobile Data Plan",
    amount = 29,
    type = "expense",
    category = "categories.phone",
    date = "2026-05-03",
    status = "status.paid",
    method = "methods.autopay",
    note = "Essential for navigation and delivery apps.",
    uid = "test_user_001"
  )
)

sample_goals <- list(
  list(
    id = "goal-101",
    goalTitle = "Emergency Cushion",
    purpose = "Cash buffer for slow demand weeks and repairs.",
    targetAmount = 3000,
    alreadySaved = 1650,
    deadline = "2026-10-01",
    monthlyContribution = 270,
    priority = "priority.high",
    uid = "test_user_001"
  ),
  list(
    id = "goal-102",
    goalTitle = "Tax Buffer",
    purpose = "Stay ahead on quarterly taxes without stress.",
    targetAmount = 2200,
    alreadySaved = 920,
    deadline = "2026-09-15",
    monthlyContribution = 220,
    priority = "priority.high",
    uid = "test_user_001"
  )
)

sample_recurring <- list(
  list(
    id = "rec-101",
    title = "Commercial Insurance",
    category = "categories.insurance",
    amount = 118,
    nextCharge = "2026-05-11",
    frequency = "frequency.monthly",
    status = "status.scheduled",
    uid = "test_user_001"
  ),
  list(
    id = "rec-102",
    title = "Fuel Membership",
    category = "categories.fuel",
    amount = 45,
    nextCharge = "2026-05-08",
    frequency = "frequency.monthly",
    status = "status.scheduled",
    uid = "test_user_001"
  )
)

payload <- list(
  transactions = sample_transactions,
  goals = sample_goals,
  recurringExpenses = sample_recurring
)

cat("\n=================== RUNNING PHASE 1 DATA MANAGEMENT ===================\n")
result <- process_gigpath_data(payload)

cat("Status:", result$status, "\n")
cat("\n--- RECORD COUNTS ---\n")
print(result$data_summary$counts)

cat("\n--- FINANCIAL TOTALS ---\n")
print(result$data_summary$financial_totals)

cat("\n--- VALIDATION SUMMARY ---\n")
print(result$validation)

# Test CSV export
cat("\n--- EXPORTING TO CSV ---\n")
export_to_csv(result$cleaned_data, output_dir = "data")
cat("CSVs exported successfully to data/ folder:\n")
cat(" - data/transactions.csv\n")
cat(" - data/goals.csv\n")
cat(" - data/recurring_expenses.csv\n")
cat("=======================================================================\n\n")
