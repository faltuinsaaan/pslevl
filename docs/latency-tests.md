# Latency Testing Procedure

## 1. Setup
- **Devices**:
  - React Native Client (Phone) connected to Controller (or using Virtual).
  - Browser Client (Display) on a 60Hz+ monitor.
  - Pixel Streaming Server (Unreal) running.
- **Network**:
  - Connect Phone and Display to same 5GHz WiFi or Ethernet.
  - Minimize other traffic.

## 2. RTT Measurement (Network Latency)
1. Launch Phone App.
2. Tap "Connect".
3. Observe the "Packet" debug info on Phone screen.
4. *Future*: Trigger "Ping" via hidden dev menu (simulated by signaling `ping` echo).
5. **Target**: < 50ms RTT on local network.

## 3. Motion-to-Photon Latency (End-to-End)
This measures time from "Button Press" physically to "Pixel Change" on screen.
*Tools*: High-speed camera (iPhone Slo-mo at 240fps).

1. Position Phone and Monitor in same frame.
2. Start high-speed recording.
3. Tap a button on the Phone that causes a distinct visual change (e.g., Jump/Color Change).
4. Review footage frame-by-frame.
5. Count frames between "Finger touches screen" and "Monitor pixel changes".

**Calculation**:
`Latency (ms) = (Frame Count / 240) * 1000`

**Target**:
- **Excellent**: < 60ms
- **Good**: 60-100ms
- **Poor**: > 120ms

## 4. Endurance Test
1. Maintain active stream for 30 minutes.
2. Monitor Phone temperature (subjective or thermal gun).
3. Monitor Framerate consistency on Browser.
