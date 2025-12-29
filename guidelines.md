GUIDELINES / RULES OF EXECUTION (NON-NEGOTIABLE)
================================================

PERFORMANCE
• Force hardware decode; reject software fallback.
• No Redux; avoid RN re-renders.
• Batch input events; max 120Hz.
• Benchmark latency every build.

NETWORK
• Always QUIC; never TCP for input.
• ICE servers configured early.
• Test jitter and packet loss resilience.

CODE
• TypeScript everywhere.
• Keep native bridge minimal.
• One source of truth for config/env.
• Logging: structured, no console spam.

UNREAL
• Low-poly art + baked lighting.
• Strip unnecessary shaders.
• Disable Nanite/Lumen until stable.
• Fixed timestep logic loops.

CLOUD
• One-click redeploy.
• GPU instance autoscale disabled until validated.
• Container images versioned and immutable.

TESTING
• Latency thresholds documented.
• Thermal test each build on Realme.
• Browser compatibility matrix maintained.

FAIL CONDITIONS
• >120ms sustained latency.
• Software decoding fallback.
• Thermal throttling within 10 minutes.
• Input desync >150ms average.

============================================================
SUCCESS CRITERIA
================

• End-to-end gameplay from phone to browser is functional.
• 720p/60 stable stream majority of session.
• Latency consistently 40–80ms.
• No major throttling on Realme 11 Pro.
• Usable by non-technical tester.

============================================================
FINAL DIRECTIVE
===============

Build the MVP around:
**React Native phone controller → Unreal cloud render → WebRTC stream → Browser display**.
No hybrid workload until streaming is stable.

End.
