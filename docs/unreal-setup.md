# Unreal Engine Setup for Streaming

## Project Settings
1. **Create Project**: Third Person Template (Blueprint or C++).
2. **Plugins**: Enable `Pixel Streaming` plugin.
3. **Project Settings**:
   - **Rendering**:
     - Global Illumination: None (for MVP performance) or Lumen (if supported).
     - Reflection: Screen Space (for performance).
   - **Input**:
     - Ensure Touch Interface is disabled if handling input primarily via custom events, or map Touch to Controller inputs.
   - **Pixel Streaming**:
     - *Signaling Server URL*: `ws://localhost:8080` (or your cloud IP).
     - *Streamer ID*: `Server`.

## Test Scene
1. Open the default Third Person Map.
2. Place a few rotating cubes to verify video feed smoothness.
3. Add a timestamp or frame counter on the HUD to measure latency visually.

## Packaging
- Package for **Linux** (if running on cloud Linux container) or **Windows** (if testing locally).
- Run with flags: 
  ```bash
  ./MyProject.sh -PixelStreamingURL="ws://localhost:8080" -RenderOffScreen
  ```
