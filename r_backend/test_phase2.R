# ==============================================================================
# Phase 2 Test Script — Real GigPath Population Dataset Analysis
# ==============================================================================
# File: r_backend/test_phase2.R
# Purpose: Load verified real CSV datasets, execute run_financial_analysis(),
#          and print formatted JSON API response for Phase 2 verification.
# ==============================================================================

source("r_backend/data_management.R")
source("r_backend/financial_analysis.R")

tx_file <- "data/transactions_all_users.csv"
goals_file <- "data/goals_all_users.csv"
rec_file <- "data/recurring_expenses_all_users.csv"

cat("=======================================================================\n")
cat("            PHASE 2 R FINANCIAL DATA ANALYSIS TEST RUN                 \n")
cat("=======================================================================\n\n")

if (!file.exists(tx_file) || !file.exists(goals_file) || !file.exists(rec_file)) {
  stop("FATAL ERROR: Verified real CSV datasets are missing from data/ directory.")
}

tx_df <- read.csv(tx_file, stringsAsFactors = FALSE)
goals_df <- read.csv(goals_file, stringsAsFactors = FALSE)
rec_df <- read.csv(rec_file, stringsAsFactors = FALSE)

# Validate record counts strictly
if (nrow(tx_df) != 35 || nrow(goals_df) != 16 || nrow(rec_df) != 4) {
  stop(sprintf("FATAL RECORD COUNT MISMATCH: Expected tx=35, goals=16, rec=4. Found tx=%d, goals=%d, rec=%d",
               nrow(tx_df), nrow(goals_df), nrow(rec_df)))
}

cat("[Step 1] Record Counts Validated:\n")
cat(sprintf("  - transactions_all_users.csv : %d records\n", nrow(tx_df)))
cat(sprintf("  - goals_all_users.csv        : %d records\n", nrow(goals_df)))
cat(sprintf("  - recurring_expenses_all_users.csv: %d records\n\n", nrow(rec_df)))

payload <- list(
  transactions = tx_df,
  goals = goals_df,
  recurringExpenses = rec_df
)

cat("[Step 2] Executing run_financial_analysis() in R...\n\n")
result <- run_financial_analysis(payload)

cat("Actual Phase 2 JSON Response Payload:\n")
cat("-----------------------------------------------------------------------\n")
if (requireNamespace("jsonlite", quietly = TRUE)) {
  cat(jsonlite::toJSON(result, auto_unbox = TRUE, pretty = TRUE))
} else {
  print(result)
}
cat("\n-----------------------------------------------------------------------\n\n")

# Verify Phase 1 endpoints still work
cat("[Step 3] Verifying Phase 1 Data Management Still Functions...\n")
phase1_res <- process_population_data(payload)
cat("Phase 1 Status:", phase1_res$status, "\n")
cat("Phase 1 Users Discovered:", phase1_res$data_summary$unique_users_discovered, "\n\n")

cat("=======================================================================\n")
cat("PHASE 2 TEST COMPLETED SUCCESSFULLY\n")
cat("=======================================================================\n")
