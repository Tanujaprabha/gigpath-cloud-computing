# ==============================================================================
# GigPath R Analytics Backend — Plumber API Endpoints (Phases 1, 2, 3, & 4B)
# ==============================================================================
# File: r_backend/plumber_api.R
# Purpose: Expose Plumber API endpoints:
#          - POST /data-management            (Phase 1 Individual User Data)
#          - POST /data-management/population (Phase 1 Population Dataset)
#          - POST /financial-analysis         (Phase 2 Population Financial Analysis)
#          - POST /financial-analysis/user    (Phase 4B User Financial Analysis)
#          - POST /budget-recommendation      (Phase 3 Personalized R Budget)
# ==============================================================================

source_backend_file <- function(filename) {
  p1 <- file.path("r_backend", filename)
  p2 <- filename
  if (file.exists(p1)) {
    source(p1)
  } else if (file.exists(p2)) {
    source(p2)
  } else {
    stop(sprintf("Backend file not found: %s", filename))
  }
}

source_backend_file("data_management.R")
source_backend_file("financial_analysis.R")
source_backend_file("budget_recommendation.R")

#* @apiTitle GigPath R Analytics API
#* @apiDescription R Backend for GigPath Financial Data Management, Analysis & Personalized Recommendations

# Register raw body parser for application/json requests
register_parser(
  "json_raw",
  plumber::parser_none,
  fixed = "application/json",
  verbose = FALSE
)

# Global Error Handler & Router Configuration for Plumber Router
#* @plumber
function(pr) {
  pr$setParsers(c("json_raw", "form", "text", "octet", "multi"))
  pr$setErrorHandler(function(req, res, err) {
    res$status <- 500
    res$setHeader("Content-Type", "application/json")
    origin <- if (!is.null(req$HTTP_ORIGIN)) req$HTTP_ORIGIN else "http://localhost:5173"
    res$setHeader("Access-Control-Allow-Origin", origin)
    list(
      status = "error",
      message = paste("R API Internal Error:", err$message)
    )
  })
}

#* CORS Filter to handle preflight OPTIONS and cross-origin requests from React UI
#* @filter cors
function(req, res) {
  origin <- if (!is.null(req$HTTP_ORIGIN)) req$HTTP_ORIGIN else "http://localhost:5173"
  res$setHeader("Access-Control-Allow-Origin", origin)
  res$setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
  
  if (req$REQUEST_METHOD == "OPTIONS") {
    res$status <- 204
    return(list())
  }
  
  plumber::forward()
}

# Single, Consistent Request Body JSON Parser Helper (Raw-Body Architecture)
parse_json_body <- function(req) {
  if (is.list(req$body) && !is.data.frame(req$body)) {
    return(req$body)
  }

  raw_input <- if (!is.null(req$postBody) && (is.character(req$postBody) || is.raw(req$postBody))) {
    req$postBody
  } else if (!is.null(req$body) && (is.character(req$body) || is.raw(req$body))) {
    req$body
  } else if (!is.null(req$bodyRaw) && (is.character(req$bodyRaw) || is.raw(req$bodyRaw))) {
    req$bodyRaw
  } else {
    NULL
  }

  if (is.null(raw_input)) {
    return(NULL)
  }

  if (is.raw(raw_input)) {
    raw_input <- rawToChar(raw_input)
  }

  if (!is.character(raw_input) || length(raw_input) == 0 || nchar(raw_input[1]) == 0) {
    return(NULL)
  }

  parsed <- suppressWarnings(
    tryCatch({
      jsonlite::fromJSON(
        raw_input[1],
        simplifyVector = FALSE
      )
    }, error = function(e) {
      NULL
    })
  )

  if (is.list(parsed) && !is.data.frame(parsed)) {
    return(parsed)
  }

  NULL
}

#* Process and Validate Individual User Data (Phase 1)
#* @serializer json
#* @post /data-management
function(req, res) {
  body <- parse_json_body(req)

  if (is.null(body) || !is.list(body)) {
    res$status <- 400
    return(list(
      status = "error",
      message = "Invalid or missing JSON payload in request body.",
      record_counts = list(transactions = 0, goals = 0, recurringExpenses = 0)
    ))
  }

  transactions <- if (!is.null(body$transactions)) body$transactions else list()
  goals <- if (!is.null(body$goals)) body$goals else list()
  recurringExpenses <- if (!is.null(body$recurringExpenses)) body$recurringExpenses else list()

  payload <- list(
    transactions = transactions,
    goals = goals,
    recurringExpenses = recurringExpenses
  )

  result <- tryCatch({
    process_gigpath_data(payload)
  }, error = function(e) {
    list(
      status = "error",
      message = paste("Error processing financial data:", e$message),
      validation = list(),
      data_summary = list(),
      cleaned_data = list()
    )
  })

  if (result$status == "error") {
    res$status <- 500
    return(result)
  }

  if (!is.null(body$export_csv) && isTRUE(body$export_csv)) {
    tryCatch({
      export_to_csv(result$cleaned_data, output_dir = "data")
      result$csv_exported <- TRUE
    }, error = function(e) {
      result$csv_exported <- FALSE
      result$csv_error <- e$message
    })
  }

  response_payload <- list(
    status = result$status,
    message = "Phase 1 individual user data management completed successfully.",
    record_counts = result$data_summary$counts,
    validation = result$validation,
    timestamp = format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC")
  )

  return(response_payload)
}

#* Process, Clean, and Validate Population Dataset (Phase 1)
#* @serializer json
#* @post /data-management/population
function(req, res) {
  body <- parse_json_body(req)

  if (is.null(body) || !is.list(body)) {
    res$status <- 400
    return(list(
      status = "error",
      message = "Invalid or missing JSON payload in request body.",
      record_counts = list(transactions = 0, goals = 0, recurringExpenses = 0)
    ))
  }

  transactions <- if (!is.null(body$transactions)) body$transactions else list()
  goals <- if (!is.null(body$goals)) body$goals else list()
  recurringExpenses <- if (!is.null(body$recurringExpenses)) body$recurringExpenses else list()

  payload <- list(
    transactions = transactions,
    goals = goals,
    recurringExpenses = recurringExpenses
  )

  result <- tryCatch({
    process_population_data(payload)
  }, error = function(e) {
    list(
      status = "error",
      message = paste("Error processing population data:", e$message),
      validation = list(),
      data_summary = list(),
      cleaned_data = list()
    )
  })

  if (result$status == "error") {
    res$status <- 500
    return(result)
  }

  tryCatch({
    export_population_to_csv(result$cleaned_data, output_dir = "data")
    result$population_csv_exported <- TRUE
  }, error = function(e) {
    result$population_csv_exported <- FALSE
    result$population_csv_error <- e$message
  })

  response_payload <- list(
    status = result$status,
    message = "Phase 1 population dataset management completed successfully.",
    unique_users_discovered = result$data_summary$unique_users_discovered,
    user_ids = result$data_summary$user_ids,
    record_counts = result$data_summary$counts,
    unique_users_per_dataset = result$data_summary$unique_users_per_dataset,
    validation = result$validation,
    population_csv_exported = TRUE,
    exported_files = list(
      transactions = "data/transactions_all_users.csv",
      goals = "data/goals_all_users.csv",
      recurring_expenses = "data/recurring_expenses_all_users.csv"
    ),
    timestamp = format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC")
  )

  return(response_payload)
}

#* Perform Population Financial Data Analysis (Phase 2)
#* @serializer json
#* @post /financial-analysis
function(req, res) {
  body <- parse_json_body(req)

  if (is.null(body) || !is.list(body)) {
    res$status <- 400
    return(list(
      status = "error",
      message = "Invalid or missing JSON payload in request body.",
      dataset = list(users = 0, transactions = 0, goals = 0, recurringExpenses = 0)
    ))
  }

  transactions <- if (!is.null(body$transactions)) body$transactions else list()
  goals <- if (!is.null(body$goals)) body$goals else list()
  recurringExpenses <- if (!is.null(body$recurringExpenses)) body$recurringExpenses else list()

  payload <- list(
    transactions = transactions,
    goals = goals,
    recurringExpenses = recurringExpenses
  )

  analysis_result <- tryCatch({
    run_financial_analysis(payload)
  }, error = function(e) {
    list(
      status = "error",
      message = paste("Error executing R financial analysis:", e$message),
      dataset = list(),
      analysis = list(),
      data_limitations = list()
    )
  })

  if (analysis_result$status == "error") {
    res$status <- 500
    return(analysis_result)
  }

  return(analysis_result)
}

#* Perform User Financial Data Analysis for Current Authenticated User (Phase 4B)
#* @serializer json
#* @post /financial-analysis/user
function(req, res) {
  body <- parse_json_body(req)

  if (is.null(body) || !is.list(body)) {
    res$status <- 400
    return(list(
      status = "error",
      message = "Invalid or missing JSON payload in request body.",
      user_id = "unknown",
      analysis = list()
    ))
  }

  user_id <- if (!is.null(body$user_id)) body$user_id else "unknown_user"
  transactions <- if (!is.null(body$transactions)) body$transactions else list()
  goals <- if (!is.null(body$goals)) body$goals else list()
  recurringExpenses <- if (!is.null(body$recurringExpenses)) body$recurringExpenses else list()

  payload <- list(
    user_id = user_id,
    transactions = transactions,
    goals = goals,
    recurringExpenses = recurringExpenses
  )

  analysis_result <- tryCatch({
    run_user_financial_analysis(payload)
  }, error = function(e) {
    list(
      status = "error",
      message = paste("Error executing R user financial analysis:", e$message),
      user_id = user_id,
      analysis = list()
    )
  })

  if (analysis_result$status == "error") {
    res$status <- 500
    return(analysis_result)
  }

  return(analysis_result)
}

#* Generate Personalized R Budget Recommendation for One User (Phase 3)
#* @serializer json
#* @post /budget-recommendation
function(req, res) {
  body <- parse_json_body(req)

  if (is.null(body) || !is.list(body)) {
    res$status <- 400
    return(list(
      status = "error",
      message = "Invalid or missing JSON payload in request body.",
      user_id = "unknown",
      budget_recommendation = list()
    ))
  }

  user_id <- if (!is.null(body$user_id)) body$user_id else "unknown_user"
  transactions <- if (!is.null(body$transactions)) body$transactions else list()
  goals <- if (!is.null(body$goals)) body$goals else list()
  recurringExpenses <- if (!is.null(body$recurringExpenses)) body$recurringExpenses else list()

  payload <- list(
    user_id = user_id,
    transactions = transactions,
    goals = goals,
    recurringExpenses = recurringExpenses
  )

  recommendation_result <- tryCatch({
    generate_personalized_budget(payload)
  }, error = function(e) {
    list(
      status = "error",
      message = paste("Error generating personalized budget recommendation:", e$message),
      user_id = user_id,
      budget_recommendation = list()
    )
  })

  if (recommendation_result$status == "error") {
    res$status <- 500
    return(recommendation_result)
  }

  return(recommendation_result)
}
