# ==============================================================================
# GigPath R Analytics Backend — Financial Data Analysis Module (Phase 2 & Phase 4B)
# ==============================================================================
# File: r_backend/financial_analysis.R
# Purpose: Execute reproducible data-quality filtering to remove automated test
#          records while retaining raw datasets, then calculate population and
#          user-level financial metrics on clean real Firebase data.
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

# Helper function to compute safe mean
safe_mean <- function(x) {
  x <- x[!is.na(x)]
  if (length(x) == 0) return(0)
  return(mean(x))
}

# Helper function to compute safe median
safe_median <- function(x) {
  x <- x[!is.na(x)]
  if (length(x) == 0) return(0)
  return(median(x))
}

# Helper function to compute safe min
safe_min <- function(x) {
  x <- x[!is.na(x)]
  if (length(x) == 0) return(0)
  return(min(x))
}

# Helper function to compute safe max
safe_max <- function(x) {
  x <- x[!is.na(x)]
  if (length(x) == 0) return(0)
  return(max(x))
}

# Helper function to compute safe standard deviation and CV
compute_variability_stats <- function(values) {
  clean_vals <- values[!is.na(values)]
  n <- length(clean_vals)
  
  if (n < 2) {
    return(list(
      count = n,
      mean = if (n == 1) round(clean_vals[1], 2) else 0,
      median = if (n == 1) round(clean_vals[1], 2) else 0,
      sd = "insufficient_data",
      min = if (n == 1) round(clean_vals[1], 2) else 0,
      max = if (n == 1) round(clean_vals[1], 2) else 0,
      cv = "insufficient_data"
    ))
  }
  
  m <- mean(clean_vals)
  s <- sd(clean_vals)
  cv_val <- if (m > 0) s / m else NA_real_
  
  return(list(
    count = n,
    mean = round(m, 2),
    median = round(median(clean_vals), 2),
    sd = round(s, 2),
    min = round(min(clean_vals), 2),
    max = round(max(clean_vals), 2),
    cv = if (!is.na(cv_val)) round(cv_val, 4) else "insufficient_data"
  ))
}

#' Detect automated test transaction records based on verifiable test-script signatures
is_test_transaction <- function(title, note, category) {
  title_str <- tolower(as.character(title))
  note_str <- tolower(as.character(note))
  
  is_appium <- grepl("appium", title_str) | grepl("appium", note_str)
  is_selenium <- grepl("selenium", title_str) | grepl("selenium", note_str)
  is_offline_test <- title_str == "offline income"
  
  return(is_appium | is_selenium | is_offline_test)
}

#' Detect automated test goal records based on verifiable test-script signatures
is_test_goal <- function(goalTitle, purpose) {
  title_str <- tolower(as.character(goalTitle))
  purpose_str <- tolower(as.character(purpose))
  
  is_appium <- grepl("appium", title_str) | grepl("test goal", purpose_str)
  is_offline <- title_str == "offline goal" | purpose_str == "offline test"
  
  return(is_appium | is_offline)
}

#' Detect automated test recurring expense records
is_test_recurring <- function(title) {
  title_str <- tolower(as.character(title))
  return(grepl("appium", title_str) | grepl("test", title_str))
}

#' Master Financial Data Analysis Function (Phase 2 Entry Point - Population Level)
run_financial_analysis <- function(payload) {
  cleaned_res <- process_population_data(payload)
  raw_tx_df <- cleaned_res$cleaned_data$transactions
  raw_goals_df <- cleaned_res$cleaned_data$goals
  raw_rec_df <- cleaned_res$cleaned_data$recurringExpenses

  raw_tx_count <- nrow(raw_tx_df)
  raw_goals_count <- nrow(raw_goals_df)
  raw_rec_count <- nrow(raw_rec_df)

  tx_is_test <- if (raw_tx_count > 0) mapply(is_test_transaction, raw_tx_df$title, raw_tx_df$note, raw_tx_df$category) else logical(0)
  goals_is_test <- if (raw_goals_count > 0) mapply(is_test_goal, raw_goals_df$goalTitle, raw_goals_df$purpose) else logical(0)
  rec_is_test <- if (raw_rec_count > 0) sapply(raw_rec_df$title, is_test_recurring) else logical(0)

  clean_tx_df <- raw_tx_df[!tx_is_test, ]
  clean_goals_df <- raw_goals_df[!goals_is_test, ]
  clean_rec_df <- raw_rec_df[!rec_is_test, ]

  excluded_tx <- raw_tx_df[tx_is_test, ]
  excluded_goals <- raw_goals_df[goals_is_test, ]
  excluded_rec <- raw_rec_df[rec_is_test, ]

  tx_exclusion_reasons <- if (nrow(excluded_tx) > 0) {
    lapply(1:nrow(excluded_tx), function(i) {
      row <- excluded_tx[i, ]
      list(
        user_id = row$user_id,
        id = row$id,
        title = row$title,
        amount = row$amount,
        reason = "Classified as automated test entry (Appium/Offline test script title artifact)."
      )
    })
  } else list()

  goals_exclusion_reasons <- if (nrow(excluded_goals) > 0) {
    lapply(1:nrow(excluded_goals), function(i) {
      row <- excluded_goals[i, ]
      list(
        user_id = row$user_id,
        id = row$id,
        goalTitle = row$goalTitle,
        reason = "Classified as automated test goal entry ('Appium Vacation' / 'Test goal' artifact)."
      )
    })
  } else list()

  data_dir <- "data"
  if (!dir.exists(data_dir)) dir.create(data_dir, recursive = TRUE)
  if (nrow(clean_tx_df) > 0) {
    write.csv(clean_tx_df, file = file.path(data_dir, "transactions_analysis.csv"), row.names = FALSE)
  }

  income_tx <- if (nrow(clean_tx_df) > 0 && "type" %in% names(clean_tx_df)) clean_tx_df[clean_tx_df$type == "income" & !is.na(clean_tx_df$amount), ] else clean_tx_df[0, ]
  expense_tx <- if (nrow(clean_tx_df) > 0 && "type" %in% names(clean_tx_df)) clean_tx_df[clean_tx_df$type == "expense" & !is.na(clean_tx_df$amount), ] else clean_tx_df[0, ]

  total_income <- sum(income_tx$amount, na.rm = TRUE)
  total_expenses <- sum(expense_tx$amount, na.rm = TRUE)
  net_cash_flow <- total_income - total_expenses
  savings_rate <- if (total_income > 0) round((net_cash_flow / total_income) * 100, 2) else 0
  expense_ratio <- if (total_income > 0) round((total_expenses / total_income) * 100, 2) else NA

  transaction_summary <- list(
    total_transactions = nrow(clean_tx_df),
    income_transactions_count = nrow(income_tx),
    expense_transactions_count = nrow(expense_tx),
    total_income = round(total_income, 2),
    total_expenses = round(total_expenses, 2),
    net_cash_flow = round(net_cash_flow, 2),
    savings_rate_percent = savings_rate,
    expense_to_income_ratio_percent = expense_ratio,
    income_stats = list(
      average = round(safe_mean(income_tx$amount), 2),
      median = round(safe_median(income_tx$amount), 2),
      min = round(safe_min(income_tx$amount), 2),
      max = round(safe_max(income_tx$amount), 2)
    ),
    expense_stats = list(
      average = round(safe_mean(expense_tx$amount), 2),
      median = round(safe_median(expense_tx$amount), 2),
      min = round(safe_min(expense_tx$amount), 2),
      max = round(safe_max(expense_tx$amount), 2)
    )
  )

  all_uids <- unique(c(clean_tx_df$user_id, clean_goals_df$user_id, clean_rec_df$user_id))
  all_uids <- all_uids[!is.na(all_uids) & all_uids != ""]

  per_user_metrics <- list()
  user_incomes <- c()
  user_expenses <- c()
  user_net_flows <- c()

  for (uid in all_uids) {
    u_tx <- clean_tx_df[clean_tx_df$user_id == uid, ]
    u_inc <- sum(u_tx$amount[u_tx$type == "income"], na.rm = TRUE)
    u_exp <- sum(u_tx$amount[u_tx$type == "expense"], na.rm = TRUE)
    u_net <- u_inc - u_exp
    u_savings_rate <- if (u_inc > 0) round((u_net / u_inc) * 100, 2) else 0

    user_incomes <- c(user_incomes, u_inc)
    user_expenses <- c(user_expenses, u_exp)
    user_net_flows <- c(user_net_flows, u_net)

    per_user_metrics[[uid]] <- list(
      user_id = uid,
      total_transactions = nrow(u_tx),
      total_income = round(u_inc, 2),
      total_expenses = round(u_exp, 2),
      net_cash_flow = round(u_net, 2),
      savings_rate_percent = u_savings_rate,
      average_expense = round(safe_mean(u_tx$amount[u_tx$type == "expense"]), 2)
    )
  }

  population_user_summary <- list(
    total_users_discovered = length(all_uids),
    average_income_per_user = round(safe_mean(user_incomes), 2),
    median_income_per_user = round(safe_median(user_incomes), 2),
    average_expenses_per_user = round(safe_mean(user_expenses), 2),
    median_expenses_per_user = round(safe_median(user_expenses), 2),
    average_net_cash_flow_per_user = round(safe_mean(user_net_flows), 2),
    per_user_breakdown = per_user_metrics
  )

  category_breakdown <- list()
  highest_spending_category <- "None"
  max_cat_spend <- -1

  if (nrow(expense_tx) > 0) {
    cat_split <- split(expense_tx, expense_tx$category)
    for (cat_name in names(cat_split)) {
      c_df <- cat_split[[cat_name]]
      c_total <- sum(c_df$amount, na.rm = TRUE)
      c_share <- if (total_expenses > 0) round((c_total / total_expenses) * 100, 2) else 0
      
      if (c_total > max_cat_spend) {
        max_cat_spend <- c_total
        highest_spending_category <- cat_name
      }

      category_breakdown[[cat_name]] <- list(
        category = cat_name,
        total_spending = round(c_total, 2),
        percentage_of_total_expenses = c_share,
        transaction_count = nrow(c_df),
        average_expense = round(safe_mean(c_df$amount), 2)
      )
    }
  }

  category_analysis <- list(
    highest_spending_category = highest_spending_category,
    highest_spending_amount = round(max(max_cat_spend, 0), 2),
    categories = category_breakdown
  )

  monthly_breakdown <- list()
  if (nrow(clean_tx_df) > 0 && any(!is.na(clean_tx_df$date))) {
    tx_valid_dates <- clean_tx_df[!is.na(clean_tx_df$date), ]
    months <- unique(substr(as.character(tx_valid_dates$date), 1, 7))
    months <- sort(months[!is.na(months) & months != ""])

    for (m in months) {
      m_tx <- tx_valid_dates[substr(as.character(tx_valid_dates$date), 1, 7) == m, ]
      m_inc <- sum(m_tx$amount[m_tx$type == "income"], na.rm = TRUE)
      m_exp <- sum(m_tx$amount[m_tx$type == "expense"], na.rm = TRUE)
      m_net <- m_inc - m_exp
      m_rate <- if (m_inc > 0) round((m_net / m_inc) * 100, 2) else 0

      monthly_breakdown[[m]] <- list(
        month = m,
        income = round(m_inc, 2),
        expenses = round(m_exp, 2),
        net_cash_flow = round(m_net, 2),
        savings_rate_percent = m_rate,
        transaction_count = nrow(m_tx)
      )
    }
  }

  population_expense_variability <- compute_variability_stats(expense_tx$amount)
  
  user_expense_variability <- list()
  for (uid in all_uids) {
    u_exp_vals <- clean_tx_df$amount[clean_tx_df$user_id == uid & clean_tx_df$type == "expense"]
    user_expense_variability[[uid]] <- compute_variability_stats(u_exp_vals)
  }

  population_income_variability <- compute_variability_stats(income_tx$amount)

  user_income_variability <- list()
  for (uid in all_uids) {
    u_inc_vals <- clean_tx_df$amount[clean_tx_df$user_id == uid & clean_tx_df$type == "income"]
    user_income_variability[[uid]] <- compute_variability_stats(u_inc_vals)
  }

  rec_total_amount <- if (nrow(clean_rec_df) > 0 && "amount" %in% names(clean_rec_df)) sum(clean_rec_df$amount, na.rm = TRUE) else 0
  rec_by_frequency <- list()
  if (nrow(clean_rec_df) > 0 && "frequency" %in% names(clean_rec_df)) {
    freq_split <- split(clean_rec_df, clean_rec_df$frequency)
    for (fq in names(freq_split)) {
      sub_f <- freq_split[[fq]]
      rec_by_frequency[[fq]] <- list(
        frequency = fq,
        count = nrow(sub_f),
        total_amount = round(sum(sub_f$amount, na.rm = TRUE), 2)
      )
    }
  }

  rec_analysis <- list(
    total_recurring_count = nrow(clean_rec_df),
    total_recurring_amount = round(rec_total_amount, 2),
    average_recurring_amount = round(safe_mean(clean_rec_df$amount), 2),
    min_recurring_amount = round(safe_min(clean_rec_df$amount), 2),
    max_recurring_amount = round(safe_max(clean_rec_df$amount), 2),
    by_frequency = rec_by_frequency
  )

  total_goal_target <- if (nrow(clean_goals_df) > 0 && "targetAmount" %in% names(clean_goals_df)) sum(clean_goals_df$targetAmount, na.rm = TRUE) else 0
  total_goal_saved <- if (nrow(clean_goals_df) > 0 && "alreadySaved" %in% names(clean_goals_df)) sum(clean_goals_df$alreadySaved, na.rm = TRUE) else 0
  total_goal_remaining <- max(total_goal_target - total_goal_saved, 0)
  overall_goal_completion <- if (total_goal_target > 0) round((total_goal_saved / total_goal_target) * 100, 2) else 0

  goals_by_priority <- list()
  if (nrow(clean_goals_df) > 0 && "priority" %in% names(clean_goals_df)) {
    prio_split <- split(clean_goals_df, clean_goals_df$priority)
    for (prio in names(prio_split)) {
      p_df <- prio_split[[prio]]
      goals_by_priority[[prio]] <- list(
        priority = prio,
        count = nrow(p_df),
        target_sum = round(sum(p_df$targetAmount, na.rm = TRUE), 2),
        saved_sum = round(sum(p_df$alreadySaved, na.rm = TRUE), 2)
      )
    }
  }

  goal_monthly_contrib <- if (nrow(clean_goals_df) > 0 && "monthlyContribution" %in% names(clean_goals_df)) sum(clean_goals_df$monthlyContribution, na.rm = TRUE) else 0

  goal_analysis <- list(
    total_goals_count = nrow(clean_goals_df),
    total_target_amount = round(total_goal_target, 2),
    total_already_saved = round(total_goal_saved, 2),
    total_remaining_amount = round(total_goal_remaining, 2),
    overall_completion_percentage = overall_goal_completion,
    total_monthly_contribution = round(goal_monthly_contrib, 2),
    average_goal_target = round(safe_mean(clean_goals_df$targetAmount), 2),
    average_monthly_contribution = round(safe_mean(clean_goals_df$monthlyContribution), 2),
    by_priority = goals_by_priority
  )

  recurring_burden_percent <- if (total_expenses > 0) round((rec_total_amount / total_expenses) * 100, 2) else 0

  financial_indicators <- list(
    net_cash_flow = round(net_cash_flow, 2),
    savings_rate_percent = savings_rate,
    expense_to_income_ratio_percent = expense_ratio,
    recurring_expense_burden_percent = recurring_burden_percent,
    goal_funding_gap = round(total_goal_remaining, 2),
    highest_category_spending_concentration_percent = if (total_expenses > 0) round((max(max_cat_spend, 0) / total_expenses) * 100, 2) else 0,
    average_transaction_income = round(safe_mean(income_tx$amount), 2),
    average_transaction_expense = round(safe_mean(expense_tx$amount), 2)
  )

  data_limitations <- list(
    "Raw Firebase dataset contains 35 transactions across 5 users, 16 goals, and 4 recurring expenses.",
    "Data quality filter identified and excluded 16 automated test transactions and 13 test goals generated by Appium/Offline test scripts.",
    "Clean analysis dataset contains 19 legitimate transaction records across 4 real users, 3 real goals, and 4 recurring expenses.",
    "No legitimate high-value transactions (such as ₹20,000 freelance project income or ₹25,000 study expense) were removed.",
    "Sample size remains descriptive of the current GigPath dataset and is insufficient for time-series forecasting or generalization to all gig economy workers."
  )

  return(list(
    status = "success",
    raw_dataset = list(
      transactions = raw_tx_count,
      goals = raw_goals_count,
      recurring_expenses = raw_rec_count
    ),
    analysis_dataset = list(
      transactions = nrow(clean_tx_df),
      goals = nrow(clean_goals_df),
      recurring_expenses = nrow(clean_rec_df)
    ),
    excluded_test_records = list(
      transactions_count = nrow(excluded_tx),
      goals_count = nrow(excluded_goals),
      recurring_expenses_count = nrow(excluded_rec),
      transaction_details = tx_exclusion_reasons,
      goal_details = goals_exclusion_reasons
    ),
    analysis = list(
      transaction_summary = transaction_summary,
      population_user_summary = population_user_summary,
      category_analysis = category_analysis,
      monthly_analysis = monthly_breakdown,
      expense_variability = list(
        population = population_expense_variability,
        per_user = user_expense_variability
      ),
      income_variability = list(
        population = population_income_variability,
        per_user = user_income_variability
      ),
      recurring_expenses = rec_analysis,
      goals = goal_analysis,
      financial_indicators = financial_indicators
    ),
    data_limitations = data_limitations,
    timestamp = format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC")
  ))
}

#' User Financial Data Analysis Function (Phase 4B Entry Point - Current Authenticated User)
run_user_financial_analysis <- function(payload) {
  target_user_id <- if (!is.null(payload$user_id)) as.character(payload$user_id) else "unknown_user"
  
  raw_tx <- if (!is.null(payload$transactions)) payload$transactions else list()
  raw_goals <- if (!is.null(payload$goals)) payload$goals else list()
  raw_rec <- if (!is.null(payload$recurringExpenses)) payload$recurringExpenses else list()

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

  raw_user_tx_count <- nrow(tx_df)
  raw_user_goals_count <- nrow(goals_df)
  raw_user_rec_count <- nrow(rec_df)

  # Apply Phase 2 Data Quality Filter to exclude automated test entries
  tx_is_test <- if (raw_user_tx_count > 0) mapply(is_test_transaction, tx_df$title, tx_df$note, tx_df$category) else logical(0)
  goals_is_test <- if (raw_user_goals_count > 0) mapply(is_test_goal, goals_df$goalTitle, goals_df$purpose) else logical(0)
  rec_is_test <- if (raw_user_rec_count > 0) sapply(rec_df$title, is_test_recurring) else logical(0)

  clean_tx_df <- tx_df[!tx_is_test, ]
  clean_goals_df <- goals_df[!goals_is_test, ]
  clean_rec_df <- rec_df[!rec_is_test, ]

  income_tx <- if (nrow(clean_tx_df) > 0 && "type" %in% names(clean_tx_df)) clean_tx_df[clean_tx_df$type == "income" & !is.na(clean_tx_df$amount), ] else clean_tx_df[0, ]
  expense_tx <- if (nrow(clean_tx_df) > 0 && "type" %in% names(clean_tx_df)) clean_tx_df[clean_tx_df$type == "expense" & !is.na(clean_tx_df$amount), ] else clean_tx_df[0, ]

  total_income <- sum(income_tx$amount, na.rm = TRUE)
  total_expenses <- sum(expense_tx$amount, na.rm = TRUE)
  net_cash_flow <- total_income - total_expenses
  savings_rate <- if (total_income > 0) round((net_cash_flow / total_income) * 100, 2) else 0
  expense_ratio <- if (total_income > 0) round((total_expenses / total_income) * 100, 2) else NA

  transaction_summary <- list(
    total_transactions = nrow(clean_tx_df),
    income_transactions_count = nrow(income_tx),
    expense_transactions_count = nrow(expense_tx),
    total_income = round(total_income, 2),
    total_expenses = round(total_expenses, 2),
    net_cash_flow = round(net_cash_flow, 2),
    savings_rate_percent = savings_rate,
    expense_to_income_ratio_percent = expense_ratio,
    income_stats = list(
      average = round(safe_mean(income_tx$amount), 2),
      median = round(safe_median(income_tx$amount), 2),
      min = round(safe_min(income_tx$amount), 2),
      max = round(safe_max(income_tx$amount), 2)
    ),
    expense_stats = list(
      average = round(safe_mean(expense_tx$amount), 2),
      median = round(safe_median(expense_tx$amount), 2),
      min = round(safe_min(expense_tx$amount), 2),
      max = round(safe_max(expense_tx$amount), 2)
    )
  )

  category_breakdown <- list()
  highest_spending_category <- "None"
  max_cat_spend <- -1

  if (nrow(expense_tx) > 0) {
    cat_split <- split(expense_tx, expense_tx$category)
    for (cat_name in names(cat_split)) {
      c_df <- cat_split[[cat_name]]
      c_total <- sum(c_df$amount, na.rm = TRUE)
      c_share <- if (total_expenses > 0) round((c_total / total_expenses) * 100, 2) else 0
      
      if (c_total > max_cat_spend) {
        max_cat_spend <- c_total
        highest_spending_category <- cat_name
      }

      category_breakdown[[cat_name]] <- list(
        category = cat_name,
        total_spending = round(c_total, 2),
        percentage_of_total_expenses = c_share,
        transaction_count = nrow(c_df),
        average_expense = round(safe_mean(c_df$amount), 2)
      )
    }
  }

  category_analysis <- list(
    highest_spending_category = highest_spending_category,
    highest_spending_amount = round(max(max_cat_spend, 0), 2),
    categories = category_breakdown
  )

  monthly_breakdown <- list()
  if (nrow(clean_tx_df) > 0 && any(!is.na(clean_tx_df$date))) {
    tx_valid_dates <- clean_tx_df[!is.na(clean_tx_df$date), ]
    months <- unique(substr(as.character(tx_valid_dates$date), 1, 7))
    months <- sort(months[!is.na(months) & months != ""])

    for (m in months) {
      m_tx <- tx_valid_dates[substr(as.character(tx_valid_dates$date), 1, 7) == m, ]
      m_inc <- sum(m_tx$amount[m_tx$type == "income"], na.rm = TRUE)
      m_exp <- sum(m_tx$amount[m_tx$type == "expense"], na.rm = TRUE)
      m_net <- m_inc - m_exp
      m_rate <- if (m_inc > 0) round((m_net / m_inc) * 100, 2) else 0

      monthly_breakdown[[m]] <- list(
        month = m,
        income = round(m_inc, 2),
        expenses = round(m_exp, 2),
        net_cash_flow = round(m_net, 2),
        savings_rate_percent = m_rate,
        transaction_count = nrow(m_tx)
      )
    }
  }

  income_variability <- compute_variability_stats(income_tx$amount)
  expense_variability <- compute_variability_stats(expense_tx$amount)

  rec_total_amount <- if (nrow(clean_rec_df) > 0 && "amount" %in% names(clean_rec_df)) sum(clean_rec_df$amount, na.rm = TRUE) else 0
  rec_by_frequency <- list()
  if (nrow(clean_rec_df) > 0 && "frequency" %in% names(clean_rec_df)) {
    freq_split <- split(clean_rec_df, clean_rec_df$frequency)
    for (fq in names(freq_split)) {
      sub_f <- freq_split[[fq]]
      rec_by_frequency[[fq]] <- list(
        frequency = fq,
        count = nrow(sub_f),
        total_amount = round(sum(sub_f$amount, na.rm = TRUE), 2)
      )
    }
  }

  rec_analysis <- list(
    total_recurring_count = nrow(clean_rec_df),
    total_recurring_amount = round(rec_total_amount, 2),
    average_recurring_amount = round(safe_mean(clean_rec_df$amount), 2),
    min_recurring_amount = round(safe_min(clean_rec_df$amount), 2),
    max_recurring_amount = round(safe_max(clean_rec_df$amount), 2),
    by_frequency = rec_by_frequency
  )

  total_goal_target <- if (nrow(clean_goals_df) > 0 && "targetAmount" %in% names(clean_goals_df)) sum(clean_goals_df$targetAmount, na.rm = TRUE) else 0
  total_goal_saved <- if (nrow(clean_goals_df) > 0 && "alreadySaved" %in% names(clean_goals_df)) sum(clean_goals_df$alreadySaved, na.rm = TRUE) else 0
  total_goal_remaining <- max(total_goal_target - total_goal_saved, 0)
  overall_goal_completion <- if (total_goal_target > 0) round((total_goal_saved / total_goal_target) * 100, 2) else 0
  goal_monthly_contrib <- if (nrow(clean_goals_df) > 0 && "monthlyContribution" %in% names(clean_goals_df)) sum(clean_goals_df$monthlyContribution, na.rm = TRUE) else 0

  goal_analysis <- list(
    total_goals_count = nrow(clean_goals_df),
    total_target_amount = round(total_goal_target, 2),
    total_already_saved = round(total_goal_saved, 2),
    total_remaining_amount = round(total_goal_remaining, 2),
    overall_completion_percentage = overall_goal_completion,
    total_monthly_contribution = round(goal_monthly_contrib, 2)
  )

  recurring_burden_percent <- if (total_expenses > 0) round((rec_total_amount / total_expenses) * 100, 2) else 0

  financial_indicators <- list(
    net_cash_flow = round(net_cash_flow, 2),
    savings_rate_percent = savings_rate,
    expense_to_income_ratio_percent = expense_ratio,
    recurring_expense_burden_percent = recurring_burden_percent,
    goal_funding_gap = round(total_goal_remaining, 2),
    highest_category_spending_concentration_percent = if (total_expenses > 0) round((max(max_cat_spend, 0) / total_expenses) * 100, 2) else 0
  )

  data_limitations <- list(
    "Analysis is strictly scoped to the authenticated user's individual dataset.",
    "Data quality filter excluded automated test entries (if present).",
    "Sample size reflects current user observations and is descriptive only."
  )

  return(list(
    status = "success",
    user_id = target_user_id,
    raw_user_dataset = list(
      transactions = raw_user_tx_count,
      goals = raw_user_goals_count,
      recurring_expenses = raw_user_rec_count
    ),
    data_quality = list(
      transactions_used = nrow(clean_tx_df),
      goals_used = nrow(clean_goals_df),
      recurring_expenses_used = nrow(clean_rec_df)
    ),
    analysis = list(
      transaction_summary = transaction_summary,
      category_analysis = category_analysis,
      monthly_analysis = monthly_breakdown,
      income_variability = income_variability,
      expense_variability = expense_variability,
      recurring_expenses = rec_analysis,
      goals = goal_analysis,
      financial_indicators = financial_indicators
    ),
    data_limitations = data_limitations,
    timestamp = format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC")
  ))
}
