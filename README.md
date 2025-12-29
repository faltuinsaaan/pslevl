# Portable Gaming Platform

**Phone as controller. Cloud renders Unreal Engine. Browser displays the stream.**

A low-latency cloud gaming platform that uses WebRTC to stream games from cloud GPU instances to any browser, with a phone app serving as the wireless controller.

## 🎮 Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Phone App     │────▶│  Signaling Server │◀────│  Browser Client │
│ (React Native)  │     │    (WebSocket)    │     │   (SvelteKit)   │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                        │
         │              ┌────────▼─────────┐              │
         │              │  Session Service │              │
         │              │    (REST API)    │              │
         │              └────────┬─────────┘              │
         │                       │                        │
         └───────────────────────┼────────────────────────┘
                                 │
                        ┌────────▼─────────┐
                        │   GPU Instance   │
                        │ (Unreal + NVENC) │
                        └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (optional for local dev)
- iOS Simulator (Xcode) or Android Studio
- **Google Colab** (FREE GPU) for development - see [GOOGLE_COLAB_SETUP.md](./docs/GOOGLE_COLAB_SETUP.md)
- Paperspace Gradient for production deployment - see [PAPERSPACE_SETUP.md](./docs/PAPERSPACE_SETUP.md)

### Development Mode

**Option A: Google Colab (Recommended for MVP - FREE GPU)**

1. Open [colab.research.google.com](https://colab.research.google.com)
2. Upload our notebook: `notebooks/portable-gaming-colab.ipynb`
3. Run all cells
4. Get free T4 GPU for Unreal Engine streaming!

See [GOOGLE_COLAB_SETUP.md](./docs/GOOGLE_COLAB_SETUP.md) for detailed guide.

**Option B: Local Development (No GPU)**

```bash
# Clone the repository
git clone https://github.com/your-repo/portable-gaming-platform.git
cd portable-gaming-platform

# Copy environment file
cp .env.example .env

# Install dependencies
npm install --workspaces

# Start all services (in separate terminals)
cd server/signaling && npm run dev
cd server/session && npm run dev
cd browser-client && npm run dev

# Start mobile app
cd client-phone-rn && npx expo start
```

### Docker Deployment

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with production values

# Build and start all services
docker-compose up -d

# Check health
curl http://localhost:8080/health  # Signaling
curl http://localhost:3000/health  # Session
```

## 📱 Mobile App Build

```bash
cd client-phone-rn

# Development build (simulator)
npx expo run:ios
npx expo run:android

# EAS Build (production)
npx eas build --platform ios --profile production
npx eas build --platform android --profile production
```

## 🔑 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT signing | `dev-secret-key` |
| `JWT_EXPIRY` | Token expiration time | `24h` |
| `SIGNALING_PORT` | WebSocket server port | `8080` |
| `SESSION_PORT` | REST API port | `3000` |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `localhost` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | - |

## 📡 API Reference

### Session Service (`/auth`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | Authenticate user, returns JWT |
| `/auth/verify` | GET | Verify JWT token |
| `/health` | GET | Health check |

### Signaling Server (WebSocket)

| Message Type | Direction | Description |
|--------------|-----------|-------------|
| `identify` | Client→Server | Register as phone/browser |
| `identify-ack` | Server→Client | Confirm registration |
| `peer-joined` | Server→Client | New peer connected |
| `peer-left` | Server→Client | Peer disconnected |
| `offer` | Client→Client | WebRTC offer SDP |
| `answer` | Client→Client | WebRTC answer SDP |
| `ice-candidate` | Client→Client | ICE candidate |

## 📂 Project Structure

```
├── server/
│   ├── signaling/      # WebSocket signaling server
│   └── session/        # REST API for auth
├── browser-client/     # SvelteKit display client
├── client-phone-rn/    # React Native controller app
├── docs/               # Documentation
├── docker-compose.yml  # Docker deployment
└── .env.example        # Environment template
```

## 🎯 Performance Targets

| Metric | Target | Threshold |
|--------|--------|-----------|
| Round-trip latency | 40-80ms | <120ms |
| Frame rate | 60 FPS | >30 FPS |
| Video codec | H.265/AV1 | H.264 fallback |

## 📄 License

MIT
