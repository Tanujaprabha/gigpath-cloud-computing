# ==============================================================================
# GigPath R Analytics Backend — Refined Personalized Budget Recommendation Module
# ==============================================================================
# File: r_backend/budget_recommendation.R
# Purpose: Generate personalized, data-driven budget recommendations in R for 
#          an individual user based on their actual income, recurring obligations,
#          goal contribution requirements, and historical category spending.
#          Uses controlled category expansion, explicit essential calculations,
#          and data sufficiency declarations.
# ==============================================================================

if (!exists("source_backend_file")) {
  source_backend_file <- function(filename) {
    if (file.exists(filename)) {
      source(filename)
    } else if (file.exists(file.path("r_backend", filename))) {
      source(file.path("r_backend", filename))
    }
  }
}

source_backend_file("data_management.R")
source_backend_file("financial_analysis.R")

#' Generate Personalized Budget Recommendation for One User
#' @param payload List containing user_id, transactions, goals, recurringExpenses
#' @return List containing refined personalized budget recommendations
generate_personalized_budget <- function(payload) {
  target_user_id <- if (!is.null(payload$user_id)) as.character(payload$user_id) else "unknown_user"
  
  # Extract raw arrays
  raw_tx <- if (!is.null(payload$transactions)) payload$transactions else list()
  raw_goals <- if (!is.null(payload$goals)) payload$goals else list()
  raw_rec <- if (!is.null(payload$recurringExpenses)) payload$recurringExpenses else list()

  # Clean and process using Phase 1 Data Management
  cleaned_res <- process_population_data(list(
    transactions = raw_tx,
    goals = raw_goals,
    recurringExpenses = raw_rec
  ))

  tx_df <- cleaned_res$cleaned_data$transactions
  goals_df <- cleaned_res$cleaned_data$goals
  rec_df <- cleaned_res$cleaned_data$recurringExpenses

  # Filter to target user_id strictly
  if (nrow(tx_df) > 0 && "user_id" %in% names(tx_df)) {
    if (any(tx_df$user_id == target_user_id)) {
      tx_df <- tx_df[tx_df$user_id == target_user_id, ]
    }
  }
  if (nrow(goals_df) > 0 && "user_id" %in% names(goals_df)) {
    if (any(goals_df$user_id == target_user_id)) {
      goals_df <- goals_df[goals_df$user_id == target_user_id, ]
    }
  }
  if (nrow(rec_df) > 0 && "user_id" %in% names(rec_df)) {
    if (any(rec_df$user_id == target_user_id)) {
      rec_df <- rec_df[rec_df$user_id == target_user_id, ]
    }
  }

  # Apply Phase 2 Data Quality Filter to exclude automated test entries
  tx_is_test <- mapply(is_test_transaction, tx_df$title, tx_df$note, tx_df$category)
  goals_is_test <- mapply(is_test_goal, goals_df$goalTitle, goals_df$purpose)
  rec_is_test <- sapply(rec_df$title, is_test_recurring)

  clean_tx <- tx_df[!tx_is_test, ]
  clean_goals <- goals_df[!goals_is_test, ]
  clean_rec <- rec_df[!rec_is_test, ]

  tx_used_count <- nrow(clean_tx)
  goals_used_count <- nrow(clean_goals)
  rec_used_count <- nrow(clean_rec)

  warnings_list <- c()

  # Check if data is sufficient for personalized analysis
  if (tx_used_count == 0 && goals_used_count == 0 && rec_used_count == 0) {
    return(list(
      status = "warning",
      user_id = target_user_id,
      message = "insufficient_data",
      warnings = list("No valid non-test financial records found for this user."),
      data_quality = list(
        transactions_used = 0,
        goals_used = 0,
        recurring_expenses_used = 0
      )
    ))
  }

  # Income and Expense Aggregations
  income_tx <- clean_tx[clean_tx$type == "income" & !is.na(clean_tx$amount), ]
  expense_tx <- clean_tx[clean_tx$type == "expense" & !is.na(clean_tx$amount), ]

  total_income <- sum(income_tx$amount, na.rm = TRUE)
  total_expenses <- sum(expense_tx$amount, na.rm = TRUE)
  net_cash_flow <- total_income - total_expenses

  if (total_income <= 0) {
    warnings_list <- c(warnings_list, "No positive income recorded for this user. Budget limits are constrained to essential safety caps.")
  }

  # Recurring Expense Obligations (Fixed commitments)
  total_recurring <- sum(clean_rec$amount, na.rm = TRUE)

  # Goals Monthly Contribution Needs
  total_goal_monthly_contrib <- sum(clean_goals$monthlyContribution, na.rm = TRUE)
  total_goal_remaining <- max(sum(clean_goals$targetAmount, na.rm = TRUE) - sum(clean_goals$alreadySaved, na.rm = TRUE), 0)

  # Category Spend Breakdown
  cat_spending <- list()
  cat_counts <- list()
  if (nrow(expense_tx) > 0) {
    cat_split <- split(expense_tx, expense_tx$category)
    for (cname in names(cat_split)) {
      sub_df <- cat_split[[cname]]
      cat_spending[[cname]] <- sum(sub_df$amount, na.rm = TRUE)
      cat_counts[[cname]] <- nrow(sub_df)
    }
  }

  # Define Essential Operating Categories (Fuel, Phone, Maintenance, Insurance, Taxes)
  essential_keys <- c("fuel", "phone", "maintenance", "insurance", "taxes", "categories.fuel", 
                      "categories.phone", "categories.maintenance", "categories.insurance")

  historical_essential_spend <- 0
  historical_discretionary_spend <- 0

  for (cname in names(cat_spending)) {
    c_amt <- cat_spending[[cname]]
    c_lower <- tolower(cname)
    if (any(sapply(essential_keys, function(k) grepl(k, c_lower)))) {
      historical_essential_spend <- historical_essential_spend + c_amt
    } else {
      historical_discretionary_spend <- historical_discretionary_spend + c_amt
    }
  }

  # ----------------------------------------------------------------------------
  # EXACT ESSENTIAL EXPENSE CALCULATION FORMULA
  # ----------------------------------------------------------------------------
  # Base = Max(Total Recurring Commitments, Historical Essential Category Spend)
  # Essential Limit = Base * 1.05 (5% safety buffer for inflation/contingency)
  essential_base <- max(total_recurring, historical_essential_spend)
  recommended_essential <- round(essential_base * 1.05, 2)

  essential_breakdown_detail <- list(
    total_recurring_commitments = round(total_recurring, 2),
    historical_essential_spend = round(historical_essential_spend, 2),
    essential_base_selected = round(essential_base, 2),
    contingency_buffer_percent = 5,
    recommended_essential_limit = recommended_essential
  )

  # ----------------------------------------------------------------------------
  # DYNAMIC SAVINGS & GOAL ALLOCATION
  # ----------------------------------------------------------------------------
  available_margin <- max(total_income - recommended_essential, 0)
  
  # Goal allocation is prioritized from available margin
  recommended_goal_alloc <- round(min(total_goal_monthly_contrib, available_margin), 2)
  
  # Emergency reserve allocation (up to 15% of income if margin permits)
  target_reserve <- if (total_income > 0) round(total_income * 0.15, 2) else 0
  recommended_reserve <- round(min(target_reserve, max(available_margin - recommended_goal_alloc, 0)), 2)

  recommended_total_savings <- round(recommended_goal_alloc + recommended_reserve, 2)

  # ----------------------------------------------------------------------------
  # CONTROLLED DISCRETIONARY & TOTAL SPENDING LIMIT
  # ----------------------------------------------------------------------------
  recommended_discretionary <- round(max(total_income - recommended_essential - recommended_total_savings, 0), 2)
  recommended_spending_limit <- round(recommended_essential + recommended_discretionary, 2)

  # ----------------------------------------------------------------------------
  # REFINED CONTROLLED CATEGORY LIMIT RECOMMENDATION FORMULA
  # ----------------------------------------------------------------------------
  category_recommendations <- list()
  
  if (length(cat_spending) > 0) {
    for (cname in names(cat_spending)) {
      hist_amt <- cat_spending[[cname]]
      obs_count <- cat_counts[[cname]]

      if (obs_count > 0 && hist_amt > 0) {
        # Controlled Category Recommendation:
        # Avoid artificial inflation: Cap expansion at max 10% over historical spend,
        # bounded by available discretionary room share.
        cat_share <- if (total_expenses > 0) hist_amt / total_expenses else 0
        discretionary_topup <- min(recommended_discretionary * cat_share, hist_amt * 0.10)
        
        rec_limit <- round(hist_amt + discretionary_topup, 2)
        diff <- round(rec_limit - hist_amt, 2)

        category_recommendations[[length(category_recommendations) + 1]] <- list(
          category = cname,
          historical_spending = round(hist_amt, 2),
          recommended_limit = rec_limit,
          difference = diff,
          data_sufficiency = "sufficient",
          reason = sprintf("Controlled recommendation based on historical spending (₹%.2f) and user cash margin.", hist_amt)
        )
      } else {
        category_recommendations[[length(category_recommendations) + 1]] <- list(
          category = cname,
          historical_spending = 0,
          recommended_limit = 0,
          difference = 0,
          data_sufficiency = "insufficient_data",
          reason = "Insufficient historical data for this category."
        )
      }
    }
  }

  # ----------------------------------------------------------------------------
  # GOAL RECOMMENDATION REASONING
  # ----------------------------------------------------------------------------
  goal_reasoning <- ""
  if (total_goal_monthly_contrib == 0) {
    goal_reasoning <- "No active monthly goal contributions specified. Consider creating an emergency fund goal."
  } else if (net_cash_flow >= total_goal_monthly_contrib) {
    goal_reasoning <- sprintf("Current net cash margin (₹%.2f) comfortably covers active monthly goal contributions (₹%.2f).", 
                               net_cash_flow, total_goal_monthly_contrib)
  } else if (available_margin >= total_goal_monthly_contrib) {
    goal_reasoning <- sprintf("Recommended goal allocation (₹%.2f) fully covers monthly targets after essential operating costs.", 
                               recommended_goal_alloc)
  } else {
    warnings_list <- c(warnings_list, "Current cash margin is less than target goal contributions.")
    goal_reasoning <- sprintf("Cash margin is tight. Recommended setting monthly goal contribution to ₹%.2f to protect essential buffers.", 
                               recommended_goal_alloc)
  }

  goal_recommendation <- list(
    target_monthly_contribution = round(total_goal_monthly_contrib, 2),
    recommended_monthly_contribution = recommended_goal_alloc,
    remaining_goal_gap = round(total_goal_remaining, 2),
    reason = goal_reasoning
  )

  budget_recommendation_summary <- list(
    income_reference = round(total_income, 2),
    essential_expenses_breakdown = essential_breakdown_detail,
    essential_expenses = recommended_essential,
    discretionary_expenses = recommended_discretionary,
    recurring_expenses = round(total_recurring, 2),
    goal_allocation = recommended_goal_alloc,
    recommended_savings = recommended_total_savings,
    recommended_spending_limit = recommended_spending_limit
  )

  return(list(
    status = "success",
    user_id = target_user_id,
    budget_recommendation = budget_recommendation_summary,
    category_recommendations = category_recommendations,
    goal_recommendation = goal_recommendation,
    warnings = warnings_list,
    data_quality = list(
      transactions_used = tx_used_count,
      goals_used = goals_used_count,
      recurring_expenses_used = rec_used_count
    ),
    timestamp = format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC")
  ))
}
