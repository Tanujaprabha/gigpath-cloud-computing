# Test JSON Body parsing helper
parse_json_robust <- function(raw_body, post_body = NULL) {
  cat("--- Testing parse_json_robust ---\n")
  cat("class(raw_body):", class(raw_body), "\n")
  if (!is.null(post_body)) cat("class(post_body):", class(post_body), "\n")

  parsed <- NULL

  # 1. If raw_body is already a parsed list, use it
  if (is.list(raw_body) && !is.data.frame(raw_body)) {
    cat("raw_body is already a parsed list!\n")
    parsed <- raw_body
  } else {
    # 2. Try parsing post_body or raw_body if character/raw
    target <- if (!is.null(post_body) && (is.character(post_body) || is.raw(post_body))) {
      post_body
    } else if (is.character(raw_body) || is.raw(raw_body)) {
      raw_body
    } else {
      NULL
    }

    if (!is.null(target)) {
      if (is.raw(target)) {
        target <- rawToChar(target)
      }
      tryCatch({
        parsed <- jsonlite::fromJSON(target, simplifyVector = FALSE)
        # Handle double-encoded JSON string
        if (is.character(parsed) && length(parsed) == 1) {
          parsed <- jsonlite::fromJSON(parsed, simplifyVector = FALSE)
        }
      }, error = function(e) {
        cat("JSON parse error:", e$message, "\n")
        parsed <- NULL
      })
    }
  }

  return(parsed)
}

# Test Case 1: Standard JSON String
json_str <- '{"user_id":"u123","transactions":[{"id":"t1","amount":100}]}'
res1 <- parse_json_robust(json_str)
cat("Res 1 user_id:", res1$user_id, "\n")

# Test Case 2: Double Encoded JSON String
json_double <- '"{\\"user_id\\":\\"u456\\",\\"transactions\\":[]}"'
res2 <- parse_json_robust(json_double)
cat("Res 2 user_id:", res2$user_id, "\n")

# Test Case 3: Already parsed list
json_list <- list(user_id = "u789", transactions = list())
res3 <- parse_json_robust(json_list)
cat("Res 3 user_id:", res3$user_id, "\n")
