source("r_backend/budget_recommendation.R")

tx <- read.csv("data/transactions_all_users.csv", stringsAsFactors = FALSE)
g <- read.csv("data/goals_all_users.csv", stringsAsFactors = FALSE)
r <- read.csv("data/recurring_expenses_all_users.csv", stringsAsFactors = FALSE)

uid <- "tPzibdnWM7ea6mRK28VpUR5Qqfz1"

user_tx <- tx[tx$user_id == uid, ]
user_goals <- g[g$user_id == uid, ]
user_rec <- r[r$user_id == uid, ]

cat("=======================================================================\n")
cat("            PHASE 3 COUNT CONSISTENCY & RE-VERIFICATION                \n")
cat("=======================================================================\n\n")

cat("[1] Records Received by Endpoint for Profile 1:\n")
cat(" - Transactions Received:        ", nrow(user_tx), "\n")
cat(" - Goals Received:               ", nrow(user_goals), "\n")
cat(" - Recurring Expenses Received:  ", nrow(user_rec), "\n\n")

res <- generate_personalized_budget(list(
  user_id = uid,
  transactions = user_tx,
  goals = user_goals,
  recurringExpenses = user_rec
))

cat("[2] Unique Document IDs Count:\n")
cat(" - Unique Transaction Doc IDs: ", length(unique(user_tx$id)), "\n")
cat(" - Unique Goal Doc IDs:        ", length(unique(user_goals$id)), "\n")
cat(" - Unique Recurring Doc IDs:   ", length(unique(user_rec$id)), "\n\n")

cat("[3] Final data_quality reported by API:\n")
cat(" - transactions_used:         ", res$data_quality$transactions_used, "\n")
cat(" - goals_used:                ", res$data_quality$goals_used, "\n")
cat(" - recurring_expenses_used:   ", res$data_quality$recurring_expenses_used, "\n\n")

cat("[4] Financial Recommendation Values Verified:\n")
cat(" - Income Reference:             ₹", res$budget_recommendation$income_reference, "\n")
cat(" - Essential Expenses Limit:     ₹", res$budget_recommendation$essential_expenses, "\n")
cat(" - Discretionary Expenses Limit: ₹", res$budget_recommendation$discretionary_expenses, "\n")
cat(" - Recommended Savings Target:   ₹", res$budget_recommendation$recommended_savings, "\n")
cat(" - Goal Allocation:              ₹", res$budget_recommendation$goal_allocation, "\n")
cat(" - Recommended Spending Limit:   ₹", res$budget_recommendation$recommended_spending_limit, "\n\n")

count_pass <- (res$data_quality$transactions_used == 16) && 
               (res$data_quality$goals_used == 3) && 
               (res$data_quality$recurring_expenses_used == 4)

cat("=======================================================================\n")
if (count_pass) {
  cat("PHASE 3 COUNT CONSISTENCY: PASS\n")
} else {
  cat("PHASE 3 COUNT CONSISTENCY: FAIL\n")
}
cat("=======================================================================\n")
