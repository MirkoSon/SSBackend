# Local Game Backend Simulator  

[![Build](https://github.com/OWNER/REPO/actions/workflows/release.yml/badge.svg)](https://github.com/OWNER/REPO/actions)  
[![Latest Release](https://img.shields.io/github/v/release/OWNER/REPO?logo=github)](https://github.com/OWNER/REPO/releases)  

---

## 📖 Overview  

The **Local Game Backend Simulator** is a lightweight, standalone backend service for **game prototyping**.  

It provides:  
- **Save/Load** endpoints for arbitrary JSON game state  
- **Simple authentication** (register/login)  
- **Inventory management**  
- Packaged as a single executable → **no Node.js required**  

Designed to be **stupid simple**: built for designers/prototypers to iterate fast, without worrying about real backend setup, DB corruption, or cloud deployments.  

---

## 🚀 Features  

- ✅ Save & load JSON game state  
- ✅ Basic authentication (register/login with JWT)  
- ✅ Simple inventory endpoints (add/get/delete)  
- ✅ SQLite persistence in `game.db`  
- ✅ One-click reset (delete `game.db`)  
- ✅ Executables for Windows & macOS/Linux  

---

## 📥 Downloads  

- Latest Windows build: [Download](#)  
- Latest macOS build: [Download](#)  
- Latest Linux build: [Download](#)  

*(These links auto-update on each release)*  

---

## 🛠️ Usage  

1. **Download** the executable for your OS from the links above.  
2. **Run** it from the terminal:  

   ```bash
   ./backend-sim.bin   # macOS/Linux
   backend-sim.exe     # Windows
````

3. **Test endpoints** from your game prototype or with curl/Postman:

   * Save game state

     ```bash
     curl -X POST http://localhost:3000/save \
       -H "Content-Type: application/json" \
       -d '{"id":"test1","data":{"score":42}}'
     ```

   * Load game state

     ```bash
     curl http://localhost:3000/save/test1
     ```

   * Register & login

     ```bash
     curl -X POST http://localhost:3000/auth/register \
       -H "Content-Type: application/json" \
       -d '{"username":"alice","password":"secret"}'
     ```

   * Add inventory item

     ```bash
     curl -X POST http://localhost:3000/inventory/add \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer <token>" \
       -d '{"userId":1,"itemId":"sword","quantity":1}'
     ```

---

## 🗄️ Architecture

```mermaid
flowchart TD
    A[Game Prototype (HTML/JS)] -->|HTTP REST| B[Express API Server]

    subgraph API Endpoints
        B --> C1[POST /save]
        B --> C2[GET /save/:id]
        B --> C3[DELETE /save/:id]
        B --> D1[POST /auth/register]
        B --> D2[POST /auth/login]
        B --> E1[POST /inventory/add]
        B --> E2[GET /inventory/:userId]
        B --> E3[DELETE /inventory/:userId/:itemId]
    end

    subgraph SQLite Database (game.db)
        F1[(saves table)]
        F2[(users table)]
        F3[(inventory table)]
    end

    C1 --> F1
    C2 --> F1
    C3 --> F1

    D1 --> F2
    D2 --> F2

    E1 --> F3
    E2 --> F3
    E3 --> F3
```

---

## 🔧 Development

Clone the repo and install dependencies:

```bash
git clone https://github.com/OWNER/REPO.git
cd REPO
npm install
```

Run locally (requires Node.js):

```bash
node server.js
```

Build executables manually:

```bash
npx pkg . --targets node18-win-x64 --output dist/backend-sim.exe
npx pkg . --targets node18-macos-x64 --output dist/backend-sim.bin
```

---

## ⚡ CI/CD

This repo uses **GitHub Actions** to:

* Build `.exe` and `.bin` executables for Windows, macOS, Linux
* Publish them to GitHub Releases on every tag push (`v1.0.0`, `v1.1.0`, etc.)
* Update README download links automatically

---

## 📜 License

MIT License.