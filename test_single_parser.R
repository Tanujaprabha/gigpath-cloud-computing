parse_json_body <- function(req) {
  if (is.list(req$body) && !is.data.frame(req$body)) {
    cat("[parse_json_body] Step 1: Returned pre-parsed list directly.\n")
    return(req$body)
  }
  
  raw_input <- if (!is.null(req$postBody) && (is.character(req$postBody) || is.raw(req$postBody))) {
    req$postBody
  } else if (!is.null(req$body) && (is.character(req$body) || is.raw(req$body))) {
    req$body
  } else {
    NULL
  }
  
  if (is.null(raw_input)) return(NULL)
  if (is.raw(raw_input)) raw_input <- rawToChar(raw_input)
  if (!is.character(raw_input) || length(raw_input) == 0 || nchar(raw_input[1]) == 0) return(NULL)
  
  parsed <- suppressWarnings(tryCatch({
    jsonlite::fromJSON(raw_input[1], simplifyVector = FALSE)
  }, error = function(e) {
    NULL
  }))
  
  if (is.list(parsed) && !is.data.frame(parsed)) {
    cat("[parse_json_body] Step 3: Successfully parsed raw JSON string into list.\n")
    return(parsed)
  }
  
  cat("[parse_json_body] Step 3: Input was invalid or non-list JSON, returning NULL quietly.\n")
  return(NULL)
}

# Test 1: Pre-parsed list in req$body
r1 <- parse_json_body(list(body = list(user_id = "u1", transactions = list())))
stopifnot(r1$user_id == "u1")

# Test 2: Valid raw JSON string in req$postBody
r2 <- parse_json_body(list(postBody = '{"user_id":"u2","transactions":[]}'))
stopifnot(r2$user_id == "u2")

# Test 3: Malformed JSON string with unquoted keys
r3 <- parse_json_body(list(postBody = '{user_id:u3}'))
stopifnot(is.null(r3))

cat("ALL PARSER UNIT TESTS PASSED CLEANLY!\n")
