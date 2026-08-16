# ==============================================================================
# GigPath R Analytics Backend — Data Management & Cleaning Module (Phase 1)
# ==============================================================================
# File: r_backend/data_management.R
# Purpose: Extract, clean, validate, and structure financial datasets for both:
#          1. INDIVIDUAL USER DATA
#          2. POPULATION DATASET (ALL USERS)
# ==============================================================================

# Helper function to convert a list of heterogeneous JSON/list objects into a safe data.frame
bind_list_to_df <- function(lst) {
  if (is.null(lst) || length(lst) == 0) return(data.frame())
  if (is.data.frame(lst)) return(lst)
  
  # Extract all unique field names across all elements in the list
  all_names <- unique(unlist(lapply(lst, names)))
  if (is.null(all_names) || length(all_names) == 0) return(data.frame())
  
  # Build a standardized row for each element with consistent column names
  rows <- lapply(lst, function(x) {
    row <- setNames(lapply(all_names, function(k) {
      if (!is.null(names(x)) && k %in% names(x) && !is.null(x[[k]])) {
        val <- x[[k]]
        if (is.list(val) || length(val) > 1) as.character(val) else val
      } else {
        NA
      }
    }), all_names)
    as.data.frame(row, stringsAsFactors = FALSE)
  })
  
  do.call(rbind, rows)
}

# Helper function to parse numeric values safely
parse_numeric_safe <- function(val) {
  if (is.null(val) || is.na(val)) return(NA_real_)
  if (is.numeric(val)) return(as.numeric(val))
  str_val <- gsub("[^0-9.-]", "", as.character(val))
  num <- suppressWarnings(as.numeric(str_val))
  return(num)
}

# Helper function to parse date strings safely
parse_date_safe <- function(val) {
  if (is.null(val) || is.na(val) || as.character(val) == "") return(NA)
  str_val <- substr(as.character(val), 1, 10)
  parsed_date <- suppressWarnings(as.Date(str_val, format = "%Y-%m-%d"))
  return(parsed_date)
}

#' Process and Clean Transactions Dataset
process_transactions <- function(raw_transactions) {
  summary <- list(
    total_records = 0,
    valid_records = 0,
    missing_amount = 0,
    invalid_numeric_amount = 0,
    invalid_dates = 0,
    missing_type = 0,
    unexpected_type = 0,
    missing_category = 0,
    duplicates = 0,
    warnings = c()
  )

  if (is.null(raw_transactions) || length(raw_transactions) == 0) {
    summary$warnings <- c(summary$warnings, "Transactions dataset is empty or NULL.")
    empty_df <- data.frame(
      user_id = character(), id = character(), uid = character(), title = character(), amount = numeric(),
      type = character(), category = character(), date = as.Date(character()), method = character(),
      status = character(), note = character(), createdAt = character(),
      stringsAsFactors = FALSE
    )
    return(list(data = empty_df, validation = summary))
  }

  if (is.list(raw_transactions) && !is.data.frame(raw_transactions)) {
    tx_df <- bind_list_to_df(raw_transactions)
  } else {
    tx_df <- as.data.frame(raw_transactions, stringsAsFactors = FALSE)
  }

  summary$total_records <- nrow(tx_df)
  fields <- names(tx_df)
  
  col_user_id <- if ("user_id" %in% fields) as.character(tx_df$user_id) else if ("uid" %in% fields) as.character(tx_df$uid) else rep("unknown_user", nrow(tx_df))
  col_id <- if ("id" %in% fields) as.character(tx_df$id) else rep(NA_character_, nrow(tx_df))
  col_uid <- if ("uid" %in% fields) as.character(tx_df$uid) else col_user_id
  col_title <- if ("title" %in% fields) as.character(tx_df$title) else rep("Untitled Transaction", nrow(tx_df))
  col_type <- if ("type" %in% fields) tolower(as.character(tx_df$type)) else rep("expense", nrow(tx_df))
  col_category <- if ("category" %in% fields) as.character(tx_df$category) else rep("Uncategorized", nrow(tx_df))
  col_method <- if ("method" %in% fields) as.character(tx_df$method) else rep(NA_character_, nrow(tx_df))
  col_status <- if ("status" %in% fields) as.character(tx_df$status) else rep("completed", nrow(tx_df))
  col_note <- if ("note" %in% fields) as.character(tx_df$note) else rep(NA_character_, nrow(tx_df))
  col_createdAt <- if ("createdAt" %in% fields) as.character(tx_df$createdAt) else rep(NA_character_, nrow(tx_df))

  raw_amount <- if ("amount" %in% fields) tx_df$amount else rep(NA, nrow(tx_df))
  col_amount <- sapply(raw_amount, parse_numeric_safe)

  raw_date <- if ("date" %in% fields) tx_df$date else rep(NA, nrow(tx_df))
  col_date <- do.call(c, lapply(raw_date, parse_date_safe))

  summary$missing_amount <- sum(is.na(col_amount))
  summary$invalid_numeric_amount <- sum(!is.na(col_amount) & col_amount <= 0)
  summary$invalid_dates <- sum(is.na(col_date))
  summary$missing_type <- sum(is.na(col_type))
  summary$unexpected_type <- sum(!is.na(col_type) & !(col_type %in% c("income", "expense")))
  summary$missing_category <- sum(is.na(col_category) | col_category == "" | col_category == "Uncategorized")

  if (summary$missing_amount > 0) {
    summary$warnings <- c(summary$warnings, sprintf("Detected %d transactions with missing or unparseable amount.", summary$missing_amount))
  }
  if (summary$invalid_dates > 0) {
    summary$warnings <- c(summary$warnings, sprintf("Detected %d transactions with unparseable date strings.", summary$invalid_dates))
  }

  clean_df <- data.frame(
    user_id = col_user_id,
    id = col_id,
    uid = col_uid,
    title = col_title,
    amount = col_amount,
    type = col_type,
    category = col_category,
    date = col_date,
    method = col_method,
    status = col_status,
    note = col_note,
    createdAt = col_createdAt,
    stringsAsFactors = FALSE
  )

  if (nrow(clean_df) > 1) {
    dup_keys <- paste(clean_df$user_id, clean_df$title, clean_df$amount, clean_df$type, as.character(clean_df$date), sep = "||")
    summary$duplicates <- sum(duplicated(dup_keys))
    if (summary$duplicates > 0) {
      summary$warnings <- c(summary$warnings, sprintf("Detected %d duplicate transaction records.", summary$duplicates))
    }
  }

  summary$valid_records <- sum(!is.na(clean_df$amount) & !is.na(clean_df$date) & clean_df$type %in% c("income", "expense"))

  return(list(data = clean_df, validation = summary))
}

#' Process and Clean Goals Dataset
process_goals <- function(raw_goals) {
  summary <- list(
    total_records = 0,
    valid_records = 0,
    missing_target = 0,
    invalid_numeric_target = 0,
    invalid_dates = 0,
    duplicates = 0,
    warnings = c()
  )

  if (is.null(raw_goals) || length(raw_goals) == 0) {
    summary$warnings <- c(summary$warnings, "Goals dataset is empty or NULL.")
    empty_df <- data.frame(
      user_id = character(), id = character(), uid = character(), goalTitle = character(), purpose = character(),
      targetAmount = numeric(), alreadySaved = numeric(), deadline = as.Date(character()),
      monthlyContribution = numeric(), priority = character(), createdAt = character(),
      stringsAsFactors = FALSE
    )
    return(list(data = empty_df, validation = summary))
  }

  if (is.list(raw_goals) && !is.data.frame(raw_goals)) {
    g_df <- bind_list_to_df(raw_goals)
  } else {
    g_df <- as.data.frame(raw_goals, stringsAsFactors = FALSE)
  }

  summary$total_records <- nrow(g_df)
  fields <- names(g_df)

  col_user_id <- if ("user_id" %in% fields) as.character(g_df$user_id) else if ("uid" %in% fields) as.character(g_df$uid) else rep("unknown_user", nrow(g_df))
  col_id <- if ("id" %in% fields) as.character(g_df$id) else rep(NA_character_, nrow(g_df))
  col_uid <- if ("uid" %in% fields) as.character(g_df$uid) else col_user_id
  col_title <- if ("goalTitle" %in% fields) as.character(g_df$goalTitle) else if ("title" %in% fields) as.character(g_df$title) else rep("Untitled Goal", nrow(g_df))
  col_purpose <- if ("purpose" %in% fields) as.character(g_df$purpose) else rep(NA_character_, nrow(g_df))
  col_priority <- if ("priority" %in% fields) as.character(g_df$priority) else rep("medium", nrow(g_df))
  col_createdAt <- if ("createdAt" %in% fields) as.character(g_df$createdAt) else rep(NA_character_, nrow(g_df))

  raw_target <- if ("targetAmount" %in% fields) g_df$targetAmount else rep(NA, nrow(g_df))
  col_targetAmount <- sapply(raw_target, parse_numeric_safe)

  raw_saved <- if ("alreadySaved" %in% fields) g_df$alreadySaved else if ("savedAmount" %in% fields) g_df$savedAmount else rep(0, nrow(g_df))
  col_alreadySaved <- sapply(raw_saved, parse_numeric_safe)
  col_alreadySaved[is.na(col_alreadySaved)] <- 0

  raw_contrib <- if ("monthlyContribution" %in% fields) g_df$monthlyContribution else rep(0, nrow(g_df))
  col_monthlyContribution <- sapply(raw_contrib, parse_numeric_safe)
  col_monthlyContribution[is.na(col_monthlyContribution)] <- 0

  raw_deadline <- if ("deadline" %in% fields) g_df$deadline else rep(NA, nrow(g_df))
  col_deadline <- do.call(c, lapply(raw_deadline, parse_date_safe))

  summary$missing_target <- sum(is.na(col_targetAmount))
  summary$invalid_numeric_target <- sum(!is.na(col_targetAmount) & col_targetAmount <= 0)
  summary$invalid_dates <- sum(is.na(col_deadline))

  clean_df <- data.frame(
    user_id = col_user_id,
    id = col_id,
    uid = col_uid,
    goalTitle = col_title,
    purpose = col_purpose,
    targetAmount = col_targetAmount,
    alreadySaved = col_alreadySaved,
    deadline = col_deadline,
    monthlyContribution = col_monthlyContribution,
    priority = col_priority,
    createdAt = col_createdAt,
    stringsAsFactors = FALSE
  )

  if (nrow(clean_df) > 1) {
    dup_keys <- paste(clean_df$user_id, clean_df$goalTitle, clean_df$targetAmount, sep = "||")
    summary$duplicates <- sum(duplicated(dup_keys))
  }

  summary$valid_records <- sum(!is.na(clean_df$targetAmount) & clean_df$targetAmount > 0)

  return(list(data = clean_df, validation = summary))
}

#' Process and Clean Recurring Expenses Dataset
process_recurring_expenses <- function(raw_recurring) {
  summary <- list(
    total_records = 0,
    valid_records = 0,
    missing_amount = 0,
    invalid_numeric_amount = 0,
    invalid_dates = 0,
    duplicates = 0,
    warnings = c()
  )

  if (is.null(raw_recurring) || length(raw_recurring) == 0) {
    summary$warnings <- c(summary$warnings, "Recurring expenses dataset is empty or NULL.")
    empty_df <- data.frame(
      user_id = character(), id = character(), uid = character(), title = character(), category = character(),
      amount = numeric(), nextCharge = as.Date(character()), frequency = character(),
      status = character(), createdAt = character(),
      stringsAsFactors = FALSE
    )
    return(list(data = empty_df, validation = summary))
  }

  if (is.list(raw_recurring) && !is.data.frame(raw_recurring)) {
    r_df <- bind_list_to_df(raw_recurring)
  } else {
    r_df <- as.data.frame(raw_recurring, stringsAsFactors = FALSE)
  }

  summary$total_records <- nrow(r_df)
  fields <- names(r_df)

  col_user_id <- if ("user_id" %in% fields) as.character(r_df$user_id) else if ("uid" %in% fields) as.character(r_df$uid) else rep("unknown_user", nrow(r_df))
  col_id <- if ("id" %in% fields) as.character(r_df$id) else rep(NA_character_, nrow(r_df))
  col_uid <- if ("uid" %in% fields) as.character(r_df$uid) else col_user_id
  col_title <- if ("title" %in% fields) as.character(r_df$title) else rep("Untitled Recurring", nrow(r_df))
  col_category <- if ("category" %in% fields) as.character(r_df$category) else rep("Uncategorized", nrow(r_df))
  col_frequency <- if ("frequency" %in% fields) as.character(r_df$frequency) else rep("frequency.monthly", nrow(r_df))
  col_status <- if ("status" %in% fields) as.character(r_df$status) else rep("status.scheduled", nrow(r_df))
  col_createdAt <- if ("createdAt" %in% fields) as.character(r_df$createdAt) else rep(NA_character_, nrow(r_df))

  raw_amount <- if ("amount" %in% fields) r_df$amount else rep(NA, nrow(r_df))
  col_amount <- sapply(raw_amount, parse_numeric_safe)

  raw_nextCharge <- if ("nextCharge" %in% fields) r_df$nextCharge else rep(NA, nrow(r_df))
  col_nextCharge <- do.call(c, lapply(raw_nextCharge, parse_date_safe))

  summary$missing_amount <- sum(is.na(col_amount))
  summary$invalid_numeric_amount <- sum(!is.na(col_amount) & col_amount < 0)
  summary$invalid_dates <- sum(is.na(col_nextCharge))

  clean_df <- data.frame(
    user_id = col_user_id,
    id = col_id,
    uid = col_uid,
    title = col_title,
    category = col_category,
    amount = col_amount,
    nextCharge = col_nextCharge,
    frequency = col_frequency,
    status = col_status,
    createdAt = col_createdAt,
    stringsAsFactors = FALSE
  )

  if (nrow(clean_df) > 1) {
    dup_keys <- paste(clean_df$user_id, clean_df$title, clean_df$amount, as.character(clean_df$nextCharge), sep = "||")
    summary$duplicates <- sum(duplicated(dup_keys))
  }

  summary$valid_records <- sum(!is.na(clean_df$amount) & clean_df$amount > 0)

  return(list(data = clean_df, validation = summary))
}

# ------------------------------------------------------------------------------
# POPULATION DATASET MANAGEMENT FUNCTIONS (ALL USERS)
# ------------------------------------------------------------------------------

#' Process Population Dataset across ALL users
process_population_data <- function(payload) {
  tx_res <- process_transactions(payload$transactions)
  goals_res <- process_goals(payload$goals)
  rec_res <- process_recurring_expenses(payload$recurringExpenses)

  tx_df <- tx_res$data
  goals_df <- goals_res$data
  rec_df <- rec_res$data

  user_ids_tx <- unique(tx_df$user_id)
  user_ids_goals <- unique(goals_df$user_id)
  user_ids_rec <- unique(rec_df$user_id)

  all_user_ids <- unique(c(user_ids_tx, user_ids_goals, user_ids_rec))
  all_user_ids <- all_user_ids[!is.na(all_user_ids) & all_user_ids != ""]

  summary_counts <- list(
    transactions = nrow(tx_df),
    goals = nrow(goals_df),
    recurringExpenses = nrow(rec_df)
  )

  unique_users_per_dataset <- list(
    transactions_users = length(user_ids_tx[!is.na(user_ids_tx) & user_ids_tx != ""]),
    goals_users = length(user_ids_goals[!is.na(user_ids_goals) & user_ids_goals != ""]),
    recurring_expenses_users = length(user_ids_rec[!is.na(user_ids_rec) & user_ids_rec != ""])
  )

  validations <- list(
    transactions = tx_res$validation,
    goals = goals_res$validation,
    recurringExpenses = rec_res$validation
  )

  has_warnings <- any(sapply(validations, function(v) length(v$warnings) > 0))

  return(list(
    status = if (has_warnings) "warning" else "success",
    data_summary = list(
      unique_users_discovered = length(all_user_ids),
      user_ids = all_user_ids,
      counts = summary_counts,
      unique_users_per_dataset = unique_users_per_dataset
    ),
    validation = validations,
    cleaned_data = list(
      transactions = tx_df,
      goals = goals_df,
      recurringExpenses = rec_df
    )
  ))
}

#' Master Function for Phase 1 Individual User Data
process_gigpath_data <- function(payload) {
  return(process_population_data(payload))
}

#' Export Cleaned Individual User Data to CSV
export_to_csv <- function(cleaned_data, output_dir = "data") {
  if (!dir.exists(output_dir)) {
    dir.create(output_dir, recursive = TRUE)
  }

  write.csv(cleaned_data$transactions, file.path(output_dir, "transactions.csv"), row.names = FALSE)
  write.csv(cleaned_data$goals, file.path(output_dir, "goals.csv"), row.names = FALSE)
  write.csv(cleaned_data$recurringExpenses, file.path(output_dir, "recurring_expenses.csv"), row.names = FALSE)

  return(TRUE)
}

#' Export Cleaned Population Dataset to CSV
export_population_to_csv <- function(cleaned_data, output_dir = "data") {
  if (!dir.exists(output_dir)) {
    dir.create(output_dir, recursive = TRUE)
  }

  write.csv(cleaned_data$transactions, file.path(output_dir, "transactions_all_users.csv"), row.names = FALSE)
  write.csv(cleaned_data$goals, file.path(output_dir, "goals_all_users.csv"), row.names = FALSE)
  write.csv(cleaned_data$recurringExpenses, file.path(output_dir, "recurring_expenses_all_users.csv"), row.names = FALSE)

  return(TRUE)
}
