source("r_backend/budget_recommendation.R")

tx <- read.csv("data/transactions_all_users.csv", stringsAsFactors = FALSE)
g <- read.csv("data/goals_all_users.csv", stringsAsFactors = FALSE)
r <- read.csv("data/recurring_expenses_all_users.csv", stringsAsFactors = FALSE)

uid <- "tPzibdnWM7ea6mRK28VpUR5Qqfz1"

cat("=== DEBUGGING COUNTS FOR USER A == me\n")
cat("Total tx rows in CSV:", nrow(tx), "\n")
cat("User A tx rows in CSV:", nrow(tx[tx$user_id == uid, ]), "\n")

cat("Total goals rows in CSV:", nrow(g), "\n")
cat("User A goals rows in CSV:", nrow(g[g$user_id == uid, ]), "\n")

cat("Total recurring rows in CSV:", nrow(r), "\n")
cat("User A recurring rows in CSV:", nrow(r[r$user_id == uid, ]), "\n\n")

# Test calling generate_personalized_budget with ALL population data
res_pop <- generate_personalized_budget(list(
  user_id = uid,
  transactions = tx,
  goals = g,
  recurringExpenses = r
))

cat("[Call 1 - Passing full population dataset]\n")
cat("data_quality$transactions_used:", res_pop$data_quality$transactions_used, "\n")
cat("data_quality$goals_used:", res_pop$data_quality$goals_used, "\n")
cat("data_quality$recurring_expenses_used:", res_pop$data_quality$recurring_expenses_used, "\n\n")

# Test calling generate_personalized_budget with ONLY User A filtered data
res_user <- generate_personalized_budget(list(
  user_id = uid,
  transactions = tx[tx$user_id == uid, ],
  goals = g[g$user_id == uid, ],
  recurringExpenses = r[r$user_id == uid, ]
))

cat("[Call 2 - Passing pre-filtered User A dataset]\n")
cat("data_quality$transactions_used:", res_user$data_quality$transactions_used, "\n")
cat("data_quality$goals_used:", res_user$data_quality$goals_used, "\n")
cat("data_quality$recurring_expenses_used:", res_user$data_quality$recurring_expenses_used, "\n\n")
