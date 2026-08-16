# Test parse_json_body implementation for all Plumber body states

parse_json_body_clean <- function(req) {
  # Case 1: Plumber has already parsed application/json into an R list in req$body
  if (is.list(req$body) && !is.data.frame(req$body)) {
    cat("[parse_json_body] Using pre-parsed req$body list directly.\n")
    return(req$body)
  }

  # Case 2: Raw byte vector or string in req$postBody or req$body
  raw_input <- if (!is.null(req$postBody) && (is.character(req$postBody) || is.raw(req$postBody))) {
    req$postBody
  } else if (!is.null(req$body) && (is.character(req$body) || is.raw(req$body))) {
    req$body
  } else {
    NULL
  }

  if (is.null(raw_input)) {
    cat("[parse_json_body] No raw body found.\n")
    return(NULL)
  }

  if (is.raw(raw_input)) {
    raw_input <- rawToChar(raw_input)
  }

  # Case 3: Parse JSON string safely with tryCatch
  parsed <- tryCatch({
    res_obj <- jsonlite::fromJSON(raw_input, simplifyVector = FALSE)
    # If the JSON string was double-encoded, decode second layer
    if (is.character(res_obj) && length(res_obj) == 1) {
      res_obj <- jsonlite::fromJSON(res_obj, simplifyVector = FALSE)
    }
    res_obj
  }, error = function(e) {
    cat("[parse_json_body] JSON parse error:", e$message, "\n")
    NULL
  })

  return(parsed)
}

# Scenario 1: Plumber already parsed JSON into list
req1 <- list(body = list(user_id = "u1", transactions = list(), goals = list(), recurringExpenses = list()))
p1 <- parse_json_body_clean(req1)
cat("P1 user_id:", p1$user_id, "\n")

# Scenario 2: Unparsed JSON string in postBody
req2 <- list(postBody = '{"user_id":"u2","transactions":[],"goals":[],"recurringExpenses":[]}')
p2 <- parse_json_body_clean(req2)
cat("P2 user_id:", p2$user_id, "\n")

# Scenario 3: Malformed JSON string
req3 <- list(postBody = '{user_id:u3}')
p3 <- parse_json_body_clean(req3)
cat("P3 result is NULL:", is.null(p3), "\n")
