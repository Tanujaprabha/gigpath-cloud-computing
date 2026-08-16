# ==============================================================================
# Phase 1 Real Firebase Dataset Verification Script (R Engine)
# ==============================================================================
# File: r_backend/test_population.R
# Purpose: Load and verify the REAL Firebase datasets extracted from Firestore
#          (transactions_all_users.csv, goals_all_users.csv, recurring_expenses_all_users.csv)
# ==============================================================================

source("r_backend/data_management.R")

tx_file <- "data/transactions_all_users.csv"
goals_file <- "data/goals_all_users.csv"
rec_file <- "data/recurring_expenses_all_users.csv"

cat("\n=================== VERIFYING REAL FIREBASE DATASET IN R ===================\n")

tx_df <- if (file.exists(tx_file)) read.csv(tx_file, stringsAsFactors = FALSE) else list()
goals_df <- if (file.exists(goals_file)) read.csv(goals_file, stringsAsFactors = FALSE) else list()
rec_df <- if (file.exists(rec_file)) read.csv(rec_file, stringsAsFactors = FALSE) else list()

payload <- list(
  transactions = tx_df,
  goals = goals_df,
  recurringExpenses = rec_df
)

result <- process_population_data(payload)

cat("Processing Status:", result$status, "\n")
cat("Total Unique Real Users Discovered:", result$data_summary$unique_users_discovered, "\n")

cat("\n--- EXPORTED RECORD COUNTS ---\n")
print(result$data_summary$counts)

cat("\n--- UNIQUE USERS PER DATASET ---\n")
print(result$data_summary$unique_users_per_dataset)

cat("\n--- VALIDATION SUMMARY ---\n")
print(result$validation)

cat("=======================================================================\n\n")
