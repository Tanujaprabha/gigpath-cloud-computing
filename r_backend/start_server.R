# ==============================================================================
# R Plumber API Server Launcher
# ==============================================================================

library(plumber)

api_path <- if (file.exists("r_backend/plumber_api.R")) "r_backend/plumber_api.R" else "plumber_api.R"

cat("Starting R Plumber API Server from:", api_path, "on port 8000...\n")
pr <- plumber::plumb(api_path)
pr$run(host = "127.0.0.1", port = 8000)
