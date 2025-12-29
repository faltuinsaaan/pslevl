# Unreal Engine 5 Pixel Streaming Setup

This guide walks you through configuring an Unreal Engine 5 project for Pixel Streaming with this platform.

## Prerequisites

- Unreal Engine 5.3 or later
- Windows 10/11 or Linux with NVIDIA GPU
- NVIDIA GPU with NVENC support (GTX 1000 series or later)

## Step 1: Enable Pixel Streaming Plugin

1. Open your UE5 project
2. Go to **Edit → Plugins**
3. Search for "Pixel Streaming"
4. Enable the **Pixel Streaming** plugin
5. Restart the editor

## Step 2: Configure Project Settings

Go to **Edit → Project Settings** and configure:

### Pixel Streaming Settings
```
Project Settings → Plugins → Pixel Streaming:
- Disable throttling when not focused: ✓
- Use MediaCapture: ✓ (for better performance)
```

### Rendering Settings
```
Project Settings → Engine → Rendering:
- Default RHI: DirectX 12 (or Vulkan on Linux)
- Frame Rate: 60 or higher
```

## Step 3: Launch Parameters

Create a shortcut or batch file with these parameters:

### Windows
```batch
@echo off
"C:\Program Files\Epic Games\UE_5.3\Engine\Binaries\Win64\UnrealEditor.exe" ^
    "C:\Path\To\YourProject.uproject" ^
    -game ^
    -PixelStreamingURL=ws://YOUR_SERVER_IP:8080 ^
    -RenderOffscreen ^
    -ForceRes ^
    -ResX=1920 ^
    -ResY=1080 ^
    -PixelStreamingEncoderRateControl=VBR ^
    -PixelStreamingEncoderMaxBitrate=20000000 ^
    -log
```

### Linux
```bash
#!/bin/bash
./UnrealEditor \
    /path/to/YourProject.uproject \
    -game \
    -PixelStreamingURL=ws://YOUR_SERVER_IP:8080 \
    -RenderOffscreen \
    -ForceRes \
    -ResX=1920 \
    -ResY=1080 \
    -PixelStreamingEncoderRateControl=VBR \
    -PixelStreamingEncoderMaxBitrate=20000000 \
    -log
```

## Step 4: Signaling Server Configuration

Update your `.env` file:

```env
SIGNALING_PORT=8080
# For cloud deployment, use your public IP or domain
```

The signaling server automatically handles:
- Streamer registration
- Player connections
- WebRTC offer/answer/ICE relay
- Input forwarding from browser to UE

## Step 5: Test Locally

1. Start the signaling server:
   ```bash
   cd server/signaling && npm run dev
   ```

2. Launch UE5 with Pixel Streaming (use the batch/shell script above)

3. Open browser client:
   ```
   http://localhost:5173
   ```

4. You should see:
   - Browser: "Status: Connected (Streaming)"
   - UE5 console: Player connected logs

## Key Launch Parameters

| Parameter | Description |
|-----------|-------------|
| `-PixelStreamingURL` | Signaling server WebSocket URL |
| `-RenderOffscreen` | Don't open a window (headless) |
| `-ForceRes` | Force resolution |
| `-ResX`, `-ResY` | Resolution width/height |
| `-PixelStreamingEncoderMaxBitrate` | Max bitrate (bps) |
| `-PixelStreamingEncoderRateControl` | VBR or CBR |
| `-AudioMixer` | Enable audio streaming |

## Troubleshooting

### No video in browser
- Check UE5 console for connection logs
- Verify signaling server is running
- Check browser console for WebRTC errors

### High latency
- Reduce resolution: `-ResX=1280 -ResY=720`
- Reduce bitrate: `-PixelStreamingEncoderMaxBitrate=10000000`
- Use STUN/TURN servers for NAT traversal

### Input not working
- Ensure browser has focus
- Check input forwarding in signaling logs
- Verify UE project accepts input

## Cloud Deployment

For production deployment on GPU instances:

```bash
# AWS g4dn.xlarge example
docker-compose up -d signaling session browser

# On the GPU instance, run UE5:
./run-pixel-streaming.sh
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full cloud setup guide.
