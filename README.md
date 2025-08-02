
> **Disclaimer:**  
> This API is **unofficial** and is **not affiliated** with Anilist, Jikan, or any third-party providers. It does not host, own, or distribute any content. All data belongs to its respective owners.  



---

## **Installation**  

  
Before using Hakai API, ensure you have **Node.js** installed.  


### **Clone the Repository**  
```sh
git clone https://github.com/middlegear/hakai-api.git
cd hakai-api
```

### **Install Dependencies**  
```sh
pnpm install
```

### **Set Up Environment Variables**  
Create a `.env` file in the root directory:

```
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

# ========================
# Disable vercel build cache
# ==========================
VERCEL_FORCE_NO_BUILD_CACHE = 1
```

### **Start the Server**  
```sh
pnpm run start
```
The API will run on **`http://localhost:3000`**.

---



## ⚖ License  
This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.


