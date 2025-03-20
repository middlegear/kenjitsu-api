I can't generate an image of Beerus due to copyright restrictions, but you can add an image manually. You can use an official image from Dragon Ball or an AI-generated representation of a "feline-like god of destruction with purple skin" if you want something unique.  

Here’s how you can modify your README to include an image and information on Node.js installation:

---

# **Hakai API**  
A fast and efficient anime data provider built using Fastify.

<p align="center">
  <img src="https://your-image-link.com/beerus.png" alt="Beerus the Destroyer" width="300">
</p>

## **Features**  
✅ **Search Anime** by title  
📄 **Get Anime Metadata** including episodes and details  
📺 **Fetch Streaming Servers**  
🎥 **Get Watch Links** for anime episodes  
⚡ **Caching with Redis & Memory** for performance  
🛡️ **Rate Limiting** to prevent abuse

---

## **Installation**  

### ** Install Node.js**  
Before using Hakai API, ensure you have **Node.js** installed. You can download it from:  
➡ [Node.js Official Website](https://nodejs.org/)

To verify installation:  
```sh
node -v
```

This should output the installed Node.js version.


### ** Clone the Repository**  
```sh
git clone https://github.com/middlegear/hakai-api.git
cd hakai-api
```

### ** Install Dependencies**  
```sh
pnpm install
```

### ** Set Up Environment Variables**  
Create a `.env` file in the root directory:

```
# ========================
# Server Configuration Optional
# ========================
PORT=3000
HOSTNAME=0.0.0.0

# ========================
# Rate Limiting
# ========================
MAX_API_REQUESTS=6
WINDOW_IN_MS=1000

# ========================
# Redis Configuration Optional
# ========================
REDIS_PORT=6379
REDIS_HOST=localhost
REDIS_PASSWORD=

# ========================
# In-Memory Caching Optional 
# ========================
MEMORY_CACHE_ENABLED=false
MEMORY_CACHE_TTL_MINUTES=30

# ========================
# CORS Configuration Optional
# ========================
ALLOWED_ORIGINS=*
```

### ** Start the Server**  
```sh
pnpm run dev
```
The API will run on **`http://localhost:3000`**.

---

## **Contributing**  
Pull requests are welcome! Feel free to fork and submit improvements.  

## ⚖ License  
This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.

---

