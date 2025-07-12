
<p align="center">
  <img src="https://m3jz13d05b.ufs.sh/f/dLgmbGNJLXerMjDNawBovlI3sdb2nkrUQc6OBfxYZGS19XE7" alt="Beerus the Destroyer" width="400">
</p>

<h1 align="center">Hakai API</h1>  
<p align = "center">A RESTful api serving anime, tv and movies metadata.</p>

> **Disclaimer:**  
> This package is **unofficial** and is **not affiliated** with Anilist, Jikan, or any third-party providers. It does not host, own, or distribute any content. All data belongs to its respective owners.  



---

## **Installation**  

  
Before using Hakai API, ensure you have **Node.js** installed. You can download it from:  
➡ [Node.js Official Website](https://nodejs.org/)

To verify installation:  
```sh
node -v
```

This should output the installed Node.js version.

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

```

### **Start the Server**  
```sh
pnpm run start
```
The API will run on **`http://localhost:3000`**.

---



## ⚖ License  
This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.


