# ========================
# Server Configuration
# ========================
PORT = 3000  # Default port
HOSTNAME = 0.0.0.0  # Use 0.0.0.0 for deployed environments

# ========================
# Rate Limiting
# ========================
# Maximum API requests allowed per second (defaults to 6)
MAX_API_REQUESTS = 6
# Duration (in ms) to track requests for rate limiting (defaults to 1000 ms)
WINDOW_IN_MS = 1000

# ========================
# Redis Configuration (Optional but Recommended)
# ========================
REDIS_PORT =
REDIS_HOST = 
REDIS_PASSWORD =

# ========================



# ========================
# CORS Configuration
# ========================
# Allowed origins (default to allow all)
ALLOWED_ORIGINS = *
