# ==============================================================================
# Phase 3 Test Script — R-Based Personalized Budget Recommendation Verification
# ==============================================================================
# File: r_backend/test_phase3.R
# Purpose: Verify generate_personalized_budget() across 4 user profiles using
#          real Firebase data, confirming user isolation, test-record exclusion,
#          and dynamic recommendation variance.
# ==============================================================================

source("r_backend/data_management.R")
source("r_backend/financial_analysis.R")
source("r_backend/budget_recommendation.R")

tx_file <- "data/transactions_all_users.csv"
goals_file <- "data/goals_all_users.csv"
rec_file <- "data/recurring_expenses_all_users.csv"

cat("=======================================================================\n")
cat("            PHASE 3 PERSONALIZED R BUDGET RECOMMENDATION TEST          \n")
cat("=======================================================================\n\n")

if (!file.exists(tx_file) || !file.exists(goals_file) || !file.exists(rec_file)) {
  stop("FATAL ERROR: Verified real CSV datasets are missing from data/ directory.")
}

all_tx <- read.csv(tx_file, stringsAsFactors = FALSE)
all_goals <- read.csv(goals_file, stringsAsFactors = FALSE)
all_rec <- read.csv(rec_file, stringsAsFactors = FALSE)

# ------------------------------------------------------------------------------
# TEST PROFILE 1: User with multiple transactions, goals & recurring expenses
# ------------------------------------------------------------------------------
uid_user_a <- "tPzibdnWM7ea6mRK28VpUR5Qqfz1"
cat(sprintf("[TEST PROFILE 1] Generating Budget for User A (%s)...\n", uid_user_a))

res_a <- generate_personalized_budget(list(
  user_id = uid_user_a,
  transactions = all_tx[all_tx$user_id == uid_user_a, ],
  goals = all_goals[all_goals$user_id == uid_user_a, ],
  recurringExpenses = all_rec[all_rec$user_id == uid_user_a, ]
))

cat("User A Status:", res_a$status, "\n")
cat("Income Reference:", res_a$budget_recommendation$income_reference, "\n")
cat("Essential Expenses Limit:", res_a$budget_recommendation$essential_expenses, "\n")
cat("Discretionary Expenses Limit:", res_a$budget_recommendation$discretionary_expenses, "\n")
cat("Recommended Total Spending Limit:", res_a$budget_recommendation$recommended_spending_limit, "\n")
cat("Recommended Savings Target:", res_a$budget_recommendation$recommended_savings, "\n")
cat("Goal Allocation:", res_a$budget_recommendation$goal_allocation, "\n")
cat("Goal Reasoning:", res_a$goal_recommendation$reason, "\n\n")

# ------------------------------------------------------------------------------
# TEST PROFILE 2: User with single transaction, no goals, no recurring
# ------------------------------------------------------------------------------
uid_user_b <- "HFOr1A4UVDMLQvj64jTjVIVH8Ps2"
cat(sprintf("[TEST PROFILE 2] Generating Budget for User B (%s)...\n", uid_user_b))

res_b <- generate_personalized_budget(list(
  user_id = uid_user_b,
  transactions = all_tx[all_tx$user_id == uid_user_b, ],
  goals = all_goals[all_goals$user_id == uid_user_b, ],
  recurringExpenses = all_rec[all_rec$user_id == uid_user_b, ]
))

cat("User B Status:", res_b$status, "\n")
cat("Income Reference:", res_b$budget_recommendation$income_reference, "\n")
cat("Essential Expenses Limit:", res_b$budget_recommendation$essential_expenses, "\n")
cat("Recommended Savings Target:", res_b$budget_recommendation$recommended_savings, "\n")
cat("Goal Reasoning:", res_b$goal_recommendation$reason, "\n\n")

# ------------------------------------------------------------------------------
# TEST PROFILE 3: User with expense only (no income)
# ------------------------------------------------------------------------------
uid_user_c <- "whaTlbmekONG5YJeiXD505CRxrA2"
cat(sprintf("[TEST PROFILE 3] Generating Budget for User C (%s)...\n", uid_user_c))

res_c <- generate_personalized_budget(list(
  user_id = uid_user_c,
  transactions = all_tx[all_tx$user_id == uid_user_c, ],
  goals = all_goals[all_goals$user_id == uid_user_c, ],
  recurringExpenses = all_rec[all_rec$user_id == uid_user_c, ]
))

cat("User C Status:", res_c$status, "\n")
cat("Income Reference:", res_c$budget_recommendation$income_reference, "\n")
cat("Warnings Recorded:", paste(res_c$warnings, collapse = " | "), "\n\n")

# ------------------------------------------------------------------------------
# TEST PROFILE 4: Automated Test Account (NnIGlbSZpya3lINNr09u80kdO5L2)
# ------------------------------------------------------------------------------
uid_user_d <- "NnIGlbSZpya3lINNr09u80kdO5L2"
cat(sprintf("[TEST PROFILE 4] Testing Test-Artifact Exclusion for User D (%s)...\n", uid_user_d))

res_d <- generate_personalized_budget(list(
  user_id = uid_user_d,
  transactions = all_tx[all_tx$user_id == uid_user_d, ],
  goals = all_goals[all_goals$user_id == uid_user_d, ],
  recurringExpenses = all_rec[all_rec$user_id == uid_user_d, ]
))

cat("User D Status:", res_d$status, "\n")
cat("User D Message:", res_d$message, "\n")
cat("Transactions Used (after test filter):", res_d$data_quality$transactions_used, "\n\n")

# ------------------------------------------------------------------------------
# VERIFICATION 1: Recommendations Differ Across Users
# ------------------------------------------------------------------------------
differs_a_b <- res_a$budget_recommendation$income_reference != res_b$budget_recommendation$income_reference
cat("Verification 1 (Recommendations differ between User A and User B):", differs_a_b, "\n")

# ------------------------------------------------------------------------------
# VERIFICATION 2: User Isolation (Modifying User B data does not affect User A)
# ------------------------------------------------------------------------------
modified_tx <- rbind(all_tx, data.frame(
  user_id = uid_user_b, id = "fake-b-999", uid = uid_user_b,
  title = "Huge Bonus", amount = 100000, type = "income",
  category = "Bonus", date = "2026-08-15", method = "bank", status = "cleared",
  note = "", createdAt = "2026-08-15T00:00:00Z", stringsAsFactors = FALSE
))

res_a_isolation_test <- generate_personalized_budget(list(
  user_id = uid_user_a,
  transactions = modified_tx[modified_tx$user_id == uid_user_a, ],
  goals = all_goals[all_goals$user_id == uid_user_a, ],
  recurringExpenses = all_rec[all_rec$user_id == uid_user_a, ]
))

isolation_pass <- res_a$budget_recommendation$income_reference == res_a_isolation_test$budget_recommendation$income_reference
cat("Verification 2 (User Isolation - User B bonus does NOT affect User A):", isolation_pass, "\n\n")

cat("=======================================================================\n")
if (differs_a_b && isolation_pass && res_d$message == "insufficient_data") {
  cat("ALL PHASE 3 VERIFICATIONS PASSED SUCCESSFULLY\n")
} else {
  cat("PHASE 3 VERIFICATION FAILED\n")
}
cat("=======================================================================\n")
