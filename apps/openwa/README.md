# OpenWA (Open Source WhatsApp API Gateway)

> **YOU CAN NOW RUN WHATSAPP API ON YOUR OWN SERVER FOR FREE. 100% OPEN-SOURCE. SWIPE FOR MORE**

OpenWA is a production-grade, self-hosted WhatsApp API Gateway engineered with zero vendor lock-in, $0 per-message API fees, and pluggable architecture.

---

## 🛠️ Technical Specifications

- **License**: MIT License
- **Runtime**: Node ≥22 LTS
- **Framework**: NestJS ~11.0.28
- **Language**: TypeScript ~5.0.2
- **Containerization**: Docker & Docker Compose ready

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│               OpenWA Gateway (NestJS)                  │
├────────────────────────────────────────────────────────┤
│  • REST API: /auth/qr, /auth/pair-phone, /messages     │
│  • Dual Engine Interface: Baileys (WS) / Playwright    │
│  • Gaussian Jitter & Human Typing Simulation Engine    │
│  • Spintax & Invisible Byte-Hash Mutator Engine       │
│  • Storage: SQLite (Zero-config) / PostgreSQL          │
│  • Cache: Memory / Redis Adapter                       │
└────────────────────────────────────────────────────────┘
```

### Pluggable Architecture Highlights
1. **Dual WhatsApp Engines (`IWhatsAppEngine`)**:
   - **Baileys Engine**: High-performance, headless WebSocket multi-device protocol (default).
   - **Playwright Engine**: Visual browser automation fallback.
2. **Pluggable Storage (`IStorageProvider`)**:
   - **SQLite / File-backed**: Zero-config persistent key-value store for session auth tokens.
   - **PostgreSQL**: Production clustering adapter.
3. **Pluggable Cache (`ICacheProvider`)**:
   - **Memory**: Blazing fast local in-memory cache.
   - **Redis**: Multi-instance cluster cache.
4. **Anti-Ban Guardrails**:
   - **Box-Muller Gaussian Pacing**: Bell-curve delays between messages (45s–90s).
   - **Typing Presence Simulation**: Proportional `composing` state simulation (2.5s–5s).
   - **Byte-Hash Variation**: Injects zero-width unicode characters to prevent duplicate message hash flags by Meta ML algorithms.
   - **Indian Mobile Validator (+91)**: Formats and checks mobile ranges before sending.

---

## 🚀 Quick Start

### 1. Run with Bun or Node (Development)
```bash
cd apps/openwa
bun install
bun run dev
```

### 2. Run with Docker Compose
```bash
cd apps/openwa
docker-compose up -d
```

Open your browser to:
- **Interactive OpenAPI / Swagger Documentation**: `http://localhost:3050/docs`
- **System Health & Banner**: `http://localhost:3050/api/v1/health`

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/auth/status` | Current session status (`DISCONNECTED`, `SCAN_QR`, `CONNECTED`) |
| `GET` | `/api/v1/auth/qr` | Get live QR Code data URL to scan with WhatsApp mobile app |
| `POST`| `/api/v1/auth/pair-phone` | Get 8-character pairing code to link phone without scanning QR |
| `POST`| `/api/v1/auth/logout` | Disconnect session and wipe tokens |
| `GET` | `/api/v1/contacts/check/:phone` | Check if phone exists on WhatsApp and validates mobile (+91) |
| `POST`| `/api/v1/messages/send` | Send personalized message with typing presence simulation |
| `POST`| `/api/v1/messages/bulk-queue` | Queue bulk messages with Gaussian jitter pacing |
| `GET` | `/api/v1/health` | Telemetry, memory usage, and gateway status |

---

## 📄 License
MIT License — Copyright (c) 2026 Deep Mehta (3 Dices)
