PRODUCT CONCEPT (ONE SENTENCE)
==============================

Portable gaming platform where the **phone is the controller**, **cloud renders Unreal Engine**, and the **browser on any screen displays the stream** via **WebRTC over QUIC**.

============================================================
ARCHITECTURE (CLIENT → SERVER → BROWSER)
========================================

PHONE (REACT NATIVE CLIENT)
• Input Layer: touch, Bluetooth controller, gyro.
• Input Encoder: protobuf or flatbuffers binary.
• Transport: QUIC + WebRTC + WebSocket signaling.
• Streaming Surface: WebRTC hardware-decoded H.265/AV1.
• Local UI: library, login, settings.

SERVER (CLOUD)
• GPU instances: Paperspace Gradient A4000 (primary) / A5000 (high-end).
• Unreal Engine 5 runtime containers.
• NVENC video encode to H.265 or AV1.
• Session Gateway: QUIC/WebRTC.
• Signaling Server: NodeJS WebSocket.
• State: PostgreSQL + Redis.
• CDN: Cloudflare R2 + CDN.

BROWSER (DISPLAY CLIENT)
• SvelteKit web app.
• Native WebRTC + hardware decode.
• Canvas/WebGL draw pipeline, audio output.
• Input not accepted; phone is sole authority.

============================================================
DATA FLOW (ABSOLUTE)
====================

1. Phone connects via WebSocket to Signaling Server.
2. Signaling negotiates WebRTC session between phone and browser and server.
3. Phone sends control packets → QUIC → Gateway → Unreal game.
4. Unreal renders frame → NVENC/AMF → WebRTC stream → Browser.
5. Browser displays; phone triggers haptics and receives metadata.

Latency Target: **40–80ms roundtrip**.
Failure Threshold: **>120ms sustained** → redesign required.

============================================================
TECH STACK (FINAL)
==================

GAME ENGINE
• Unreal Engine 5 (primary)
• Unity HDRP (fallback)
• Do not use Nanite/Lumen for MVP.

MOBILE CLIENT
• React Native (TypeScript)
• react-native-webrtc
• react-native-haptic-feedback
• react-native-mmkv (storage)
• @react-navigation/native
• Jotai or Zustand (state)

BROWSER CLIENT
• SvelteKit
• Native WebRTC API
• Simple-peer (optional)

SERVER
• NodeJS (signaling, WebSocket)
• QUIC/WebTransport prototype (optional)
• Docker + NVIDIA container toolkit
• Kubernetes (K3s) optional for scaling
• Ubuntu 22.04 LTS
• PostgreSQL + Redis
• Cloudflare R2 + CDN

CODECS
• H.265 default
• AV1 when supported
• H.264 fallback only

NETWORK PROTOCOLS
• QUIC transport
• WebRTC media
• WebSocket signaling

============================================================
PROJECT STRUCTURE (REPOSITORY LAYOUT)
=====================================

```
root/
  client-phone-rn/
    src/
      screens/
        LoginScreen.tsx
        LibraryScreen.tsx
        StreamingScreen.tsx
      components/
        VideoSurface.tsx
        ControllerInput.tsx
      services/
        signaling.ts
        input.ts
        storage.ts
      hooks/
        useWebRTC.ts
        useController.ts
      config/
        env.ts
    android/
    ios/ (not needed MVP)

  browser-client/
    src/
      routes/
        +page.svelte
    lib/
      webrtc.ts
      signaling.ts

  server/
    signaling/
      index.ts
    gateway/
      quic.go (placeholder)
    session/
      docker-compose.yml
      launcher.sh

  docs/
    architecture.md
    latency-tests.md
```

============================================================
ROADMAP (NO WEEKS)
==================

PHASE 1 — FOUNDATION
• Define MVP: cloud stream only; no hybrid.
• Setup Google Colab with FREE T4 GPU for development and testing.
• Build WebSocket signaling server.
• Create Unreal test scene.
• Validate on Colab before moving to Paperspace for production.

PHASE 2 — CLIENT & DISPLAY
• Initialize React Native project.
• Integrate react-native-webrtc.
• Build SvelteKit browser client.
• Validate H.265 decode on Realme 11 Pro and desktop Chrome.

PHASE 3 — INPUT SYSTEM
• Implement binary input protocol (protobuf).
• Capture controller/touch/gyro.
• Map to Unreal character.
• Add phone haptics feedback.

PHASE 4 — PLAYABLE LOOP
• Phone launches session.
• Server streams to browser.
• Achieve 720p/60 stable.
• Add dynamic bitrate adaptation.

PHASE 5 — PLATFORM BASICS
• Add JWT auth.
• Cloud save: Redis→PostgreSQL.
• CDN for assets.
• Launcher content list.

PHASE 6 — OPTIMIZATION
• Enable AV1 on supported devices.
• Tune jitter buffer + decode pipeline.
• Autoscaling rules.
• Thermal profiling on Realme.

PHASE 7 — MVP VALIDATION
• 40–80ms latency target.
• 30–60 min endurance sessions.
• Non-technical user tests.
• Document failure points.

