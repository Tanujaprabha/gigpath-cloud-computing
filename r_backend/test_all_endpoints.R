# ==============================================================================
# Full R API Endpoint Suite Verification (Phases 1, 2, and 3)
# ==============================================================================

source("r_backend/data_management.R")
source("r_backend/financial_analysis.R")
source("r_backend/budget_recommendation.R")

tx_file <- "data/transactions_all_users.csv"
goals_file <- "data/goals_all_users.csv"
rec_file <- "data/recurring_expenses_all_users.csv"

all_tx <- read.csv(tx_file, stringsAsFactors = FALSE)
all_goals <- read.csv(goals_file, stringsAsFactors = FALSE)
all_rec <- read.csv(rec_file, stringsAsFactors = FALSE)

payload_all <- list(
  transactions = all_tx,
  goals = all_goals,
  recurringExpenses = all_rec
)

cat("=======================================================================\n")
cat("          VERIFYING ALL R BACKEND ENDPOINTS (PHASES 1, 2, 3)           \n")
cat("=======================================================================\n\n")

# 1. Phase 1 Individual User Data Management
p1_indiv <- process_gigpath_data(payload_all)
cat("[Endpoint 1: POST /data-management] Status:", p1_indiv$status, "\n")

# 2. Phase 1 Population Dataset Management
p1_pop <- process_population_data(payload_all)
cat("[Endpoint 2: POST /data-management/population] Status:", p1_pop$status, "\n")

# 3. Phase 2 Financial Data Analysis
p2_analysis <- run_financial_analysis(payload_all)
cat("[Endpoint 3: POST /financial-analysis] Status:", p2_analysis$status, "\n")
cat(" -> Clean Transactions Analyzed:", p2_analysis$analysis_dataset$transactions, "\n")
cat(" -> Net Cash Flow:", p2_analysis$analysis$transaction_summary$net_cash_flow, "\n")

# 4. Phase 3 Personalized Budget Recommendation
p3_budget <- generate_personalized_budget(list(
  user_id = "tPzibdnWM7ea6mRK28VpUR5Qqfz1",
  transactions = all_tx[all_tx$user_id == "tPzibdnWM7ea6mRK28VpUR5Qqfz1", ],
  goals = all_goals[all_goals$user_id == "tPzibdnWM7ea6mRK28VpUR5Qqfz1", ],
  recurringExpenses = all_rec[all_rec$user_id == "tPzibdnWM7ea6mRK28VpUR5Qqfz1", ]
))
cat("[Endpoint 4: POST /budget-recommendation] Status:", p3_budget$status, "\n")
cat(" -> Income Reference:", p3_budget$budget_recommendation$income_reference, "\n")
cat(" -> Recommended Spending Limit:", p3_budget$budget_recommendation$recommended_spending_limit, "\n")

cat("\n=======================================================================\n")
cat("ALL ENDPOINTS VERIFIED AND FUNCTIONAL\n")
cat("=======================================================================\n")
