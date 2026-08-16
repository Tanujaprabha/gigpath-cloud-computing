raw_input <- '"{\\user_id:tPzibdnWM7}"'

cat("Testing current parse_json_body logic...\n")
parsed <- tryCatch({
  res_obj <- jsonlite::fromJSON(raw_input, simplifyVector = FALSE)
  cat("First fromJSON succeeded. Class of res_obj:", class(res_obj), "Value:", res_obj, "\n")
  if (is.character(res_obj) && length(res_obj) == 1) {
    cat("Calling second fromJSON on res_obj...\n")
    res_obj <- jsonlite::fromJSON(res_obj, simplifyVector = FALSE)
  }
  res_obj
}, error = function(e) {
  cat("Caught error:\n")
  print(e)
  NULL
})
