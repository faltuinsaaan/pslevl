# Google Colab GPU Deployment Guide

Deploy the Portable Gaming Platform on Google Colab with **FREE GPU access** for development and testing.

## Why Google Colab?

- **FREE GPU access** (Tesla T4 or better)
- **Zero setup** - runs in browser
- **No payment required** for basic tier
- **Pre-installed NVIDIA drivers** and CUDA
- **Jupyter notebook interface** for easy debugging
- **Perfect for MVP testing** before production deployment
- **Upgrade to Colab Pro** for longer sessions ($10/month)

### Limitations

- **Session timeout**: 12 hours max (90 min idle on free tier)
- **Not suitable for 24/7 production** (use Paperspace/AWS for that)
- **Public IP changes** on each session
- **Best for**: Development, testing, prototyping

---

## Step 1: Access Google Colab

1. Go to [colab.research.google.com](https://colab.research.google.com)
2. Sign in with Google account (free)
3. No payment or approval needed!

---

## Step 2: Create Deployment Notebook

### Option A: Use Our Pre-built Notebook (Recommended)

1. **Download**: [portable-gaming-colab.ipynb](../notebooks/portable-gaming-colab.ipynb)
2. **Upload to Colab**: File → Upload notebook
3. **Run all cells**: Runtime → Run all

### Option B: Manual Setup (Step-by-step below)

Create a new notebook and follow the cells below.

---

## Setup Cells for Google Colab

### Cell 1: Enable GPU Runtime

```python
# First: Go to Runtime → Change runtime type → GPU (T4)
# Verify GPU is available
!nvidia-smi
```

### Cell 2: System Setup

```python
# Update system and install dependencies
!apt-get update -qq
!apt-get install -y nodejs npm curl git

# Install Node.js 20
!curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
!apt-get install -y nodejs

# Verify versions
!node --version
!npm --version
!nvidia-smi --query-gpu=name,driver_version --format=csv
```

### Cell 3: Install Docker (Optional for UE5 containers)

```python
# Install Docker (for containerized Unreal Engine)
!apt-get install -y docker.io
!systemctl start docker

# Test Docker GPU access
!docker run --rm --gpus all nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi
```

### Cell 4: Clone Repository

```python
# Clone the gaming platform
!git clone https://github.com/YOUR_USERNAME/portable-gaming-platform.git
%cd portable-gaming-platform
```

### Cell 5: Install Project Dependencies

```python
# Install all npm dependencies
!npm install --workspaces

# Verify installations
!ls -la server/signaling
!ls -la server/session
!ls -la browser-client
```

### Cell 6: Configure Environment

```python
import os
import subprocess

# Get Colab's public IP (via ngrok tunnel - see next cell)
# For now, use localhost
env_config = """
NODE_ENV=development
JWT_SECRET=colab-dev-secret-key-change-in-production
CORS_ORIGINS=*
SIGNALING_PORT=8080
SESSION_PORT=3000
GPU_ENABLED=true
NVENC_CODEC=h265
"""

# Write .env file
with open('.env', 'w') as f:
    f.write(env_config)

print("✅ Environment configured")
```

### Cell 7: Install ngrok (Public URL)

```python
# Install ngrok for public URLs
!pip install pyngrok

# Import and configure
from pyngrok import ngrok, conf
import getpass

# Get ngrok auth token (free from https://dashboard.ngrok.com/signup)
# Run this ONCE and paste your token:
# ngrok_token = getpass.getpass('Enter your ngrok token: ')
# !ngrok authtoken {ngrok_token}

# Or hardcode (not recommended):
ngrok_token = "YOUR_NGROK_TOKEN_HERE"  # Get from ngrok.com
!ngrok authtoken {ngrok_token}

print("✅ ngrok installed and configured")
```

### Cell 8: Start Signaling Server

```python
# Start signaling server in background
import subprocess
import time

# Kill any existing processes
!pkill -f "node.*signaling" || true

# Start signaling server
signaling_process = subprocess.Popen(
    ["npm", "run", "dev"],
    cwd="server/signaling",
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

time.sleep(5)  # Wait for server to start

# Create ngrok tunnel for WebSocket
signaling_tunnel = ngrok.connect(8080, "tcp")
print(f"🚀 Signaling Server: {signaling_tunnel.public_url}")
print(f"   Use this URL in your mobile app and browser client")
```

### Cell 9: Start Session Service

```python
# Start session service in background
session_process = subprocess.Popen(
    ["npm", "run", "dev"],
    cwd="server/session",
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

time.sleep(3)

# Create ngrok tunnel for REST API
session_tunnel = ngrok.connect(3000, "http")
print(f"🚀 Session Service: {session_tunnel.public_url}")

# Test health endpoint
!curl {session_tunnel.public_url}/health
```

### Cell 10: Install Unreal Engine (Pixel Streaming)

```python
# Download pre-built Unreal Engine 5 sample
# Using Epic's Pixel Streaming demo project

!wget -q https://cdn2.unrealengine.com/PixelStreamingDemo-Linux.tar.gz
!tar -xzf PixelStreamingDemo-Linux.tar.gz

# Or use a minimal test project (recommended for Colab)
!git clone https://github.com/EpicGames/PixelStreamingInfrastructure.git
%cd PixelStreamingInfrastructure
```

### Cell 11: Launch Unreal Game with NVENC

```python
import subprocess
import time

# Path to your Unreal Engine game binary
game_binary = "./PixelStreamingDemo/LinuxNoEditor/PixelStreamingDemo.sh"

# Launch with Pixel Streaming and NVENC
unreal_process = subprocess.Popen([
    game_binary,
    "-PixelStreamingIP=0.0.0.0",
    "-PixelStreamingPort=8888",
    "-RenderOffscreen",
    "-NVENC",
    "-NvEncCodec=h265",
    "-PixelStreamingEncoderRateControl=CBR",
    "-PixelStreamingEncoderTargetBitrate=5000000",
    "-PixelStreamingEncoderMaxBitrate=10000000",
    "-NoVSync"
], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

time.sleep(10)  # Wait for Unreal to start

# Create ngrok tunnel for Pixel Streaming
unreal_tunnel = ngrok.connect(8888, "tcp")
print(f"🎮 Unreal Engine Pixel Stream: {unreal_tunnel.public_url}")
```

### Cell 12: Start Browser Client

```python
# Start SvelteKit dev server
browser_process = subprocess.Popen(
    ["npm", "run", "dev", "--", "--host", "0.0.0.0"],
    cwd="browser-client",
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

time.sleep(5)

# Create ngrok tunnel
browser_tunnel = ngrok.connect(5173, "http")
print(f"🌐 Browser Client: {browser_tunnel.public_url}")
print(f"   Open this URL in your browser to see the stream")
```

### Cell 13: Display All Connection URLs

```python
# Summary of all endpoints
print("=" * 60)
print("🎮 PORTABLE GAMING PLATFORM - CONNECTION INFO")
print("=" * 60)
print(f"\n📱 MOBILE APP CONFIGURATION:")
print(f"   Signaling URL: {signaling_tunnel.public_url}")
print(f"   Session URL:   {session_tunnel.public_url}")

print(f"\n🌐 BROWSER CLIENT:")
print(f"   Open: {browser_tunnel.public_url}")

print(f"\n🎮 UNREAL ENGINE:")
print(f"   Pixel Stream: {unreal_tunnel.public_url}")

print("\n" + "=" * 60)
print("⚠️  IMPORTANT: These URLs change when you restart Colab!")
print("=" * 60)

# Save to file for reference
with open('connection_urls.txt', 'w') as f:
    f.write(f"Signaling: {signaling_tunnel.public_url}\n")
    f.write(f"Session: {session_tunnel.public_url}\n")
    f.write(f"Browser: {browser_tunnel.public_url}\n")
    f.write(f"Unreal: {unreal_tunnel.public_url}\n")
```

### Cell 14: Monitor GPU Usage

```python
# Real-time GPU monitoring
import time
from IPython.display import clear_output

try:
    while True:
        clear_output(wait=True)
        !nvidia-smi
        print("\n📊 Press interrupt (⏹️) to stop monitoring")
        time.sleep(2)
except KeyboardInterrupt:
    print("Monitoring stopped")
```

### Cell 15: Check Server Logs

```python
# View logs from running processes
import subprocess

print("=== SIGNALING SERVER LOGS ===")
!tail -n 20 server/signaling/*.log 2>/dev/null || echo "No logs yet"

print("\n=== SESSION SERVICE LOGS ===")
!tail -n 20 server/session/*.log 2>/dev/null || echo "No logs yet"

print("\n=== PROCESS STATUS ===")
!ps aux | grep -E "node|UnrealEngine" | grep -v grep
```

### Cell 16: Test WebRTC Connection

```python
# Test signaling server WebSocket
import websocket
import json

ws_url = signaling_tunnel.public_url.replace('tcp://', 'ws://')

def test_websocket():
    try:
        ws = websocket.create_connection(ws_url)
        ws.send(json.dumps({"type": "ping"}))
        result = ws.recv()
        print(f"✅ WebSocket connected: {result}")
        ws.close()
    except Exception as e:
        print(f"❌ WebSocket failed: {e}")

test_websocket()
```

### Cell 17: Cleanup (Run when done)

```python
# Stop all processes and tunnels
import signal

print("🛑 Stopping all services...")

# Kill processes
!pkill -f "node.*signaling" || true
!pkill -f "node.*session" || true
!pkill -f "npm run dev" || true
!pkill -f "UnrealEngine" || true

# Close ngrok tunnels
ngrok.kill()

print("✅ All services stopped")
print("💾 Your code is saved in Colab's workspace")
print("⚠️  Note: Files will be deleted when runtime disconnects")
```

---

## Quick Start Script (All-in-One)

Create a new Colab notebook and paste this complete setup:

```python
# ===== COMPLETE GOOGLE COLAB SETUP =====
# Run this cell to set up everything automatically

import subprocess
import time
from pyngrok import ngrok

# 1. Verify GPU
print("🔍 Checking GPU...")
!nvidia-smi --query-gpu=name --format=csv,noheader

# 2. Install dependencies
print("\n📦 Installing dependencies...")
!apt-get update -qq
!curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
!apt-get install -y nodejs
!npm install -g npm@latest

# 3. Clone repository
print("\n📥 Cloning repository...")
!git clone https://github.com/YOUR_USERNAME/portable-gaming-platform.git
%cd portable-gaming-platform

# 4. Install npm packages
print("\n📦 Installing project dependencies...")
!npm install --workspaces

# 5. Configure ngrok
ngrok_token = "YOUR_NGROK_TOKEN"  # Get free token from ngrok.com
!ngrok authtoken {ngrok_token}

# 6. Start all services
print("\n🚀 Starting services...")

# Start signaling
signaling_proc = subprocess.Popen(["npm", "run", "dev"], cwd="server/signaling")
time.sleep(5)
signaling_url = ngrok.connect(8080, "tcp").public_url

# Start session
session_proc = subprocess.Popen(["npm", "run", "dev"], cwd="server/session")
time.sleep(3)
session_url = ngrok.connect(3000, "http").public_url

# Start browser client
browser_proc = subprocess.Popen(["npm", "run", "dev"], cwd="browser-client")
time.sleep(5)
browser_url = ngrok.connect(5173, "http").public_url

# 7. Display URLs
print("\n" + "="*60)
print("✅ ALL SERVICES RUNNING!")
print("="*60)
print(f"📱 Signaling: {signaling_url}")
print(f"🔐 Session:   {session_url}")
print(f"🌐 Browser:   {browser_url}")
print("="*60)
```

---

## Update Mobile App Configuration

Once you have the ngrok URLs, update your mobile app:

```bash
# On your local machine (not in Colab)
cd client-phone-rn

# Create .env file with Colab URLs
cat > .env << EOF
EXPO_PUBLIC_SIGNALING_URL=tcp://0.tcp.ngrok.io:12345
EXPO_PUBLIC_SESSION_URL=https://abc123.ngrok.io
EOF

# Restart Expo
npx expo start
```

---

## Colab Pro vs Free Tier

| Feature | Free | Colab Pro ($10/mo) |
|---------|------|-------------------|
| GPU Type | T4 | T4, P100, or V100 |
| Max Session | 12 hours | 24 hours |
| Idle Timeout | 90 minutes | 90 minutes |
| Background Execution | No | Yes |
| Priority Access | No | Yes |

**Recommendation**: Start with **Free tier** for MVP testing, upgrade to Pro if you need longer sessions.

---

## Performance Tips

### 1. Reduce Unreal Engine Load

```python
# Use lower resolution for faster rendering
unreal_flags = [
    "-ResX=1280",
    "-ResY=720",
    "-PixelStreamingEncoderMaxBitrate=5000000"  # Lower bitrate
]
```

### 2. Keep Session Alive

```python
# Add this to prevent idle timeout
from IPython.display import Javascript
display(Javascript('''
    function KeepAlive() {
        console.log("Keeping session alive...");
    }
    setInterval(KeepAlive, 60000); // Every 1 minute
'''))
```

### 3. Monitor GPU Temperature

```python
!nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader
```

---

## Common Issues & Solutions

### Issue: GPU Not Available

```python
# Check runtime type
# Go to: Runtime → Change runtime type → Hardware accelerator → GPU
# Then restart runtime
```

### Issue: ngrok Tunnel Limit

**Problem**: Free ngrok allows 3 tunnels max

**Solution**: 
- Use Colab for services only
- Run browser client locally
- Or upgrade to ngrok Pro ($8/mo) for unlimited tunnels

### Issue: Session Disconnects

**Solution**: Enable "Keep-Alive" cell or upgrade to Colab Pro

### Issue: Unreal Engine Won't Start

```python
# Check if binary has execute permissions
!chmod +x path/to/YourGame.sh

# Check GPU availability
!nvidia-smi

# Try without NVENC first
!./YourGame.sh -PixelStreamingIP=0.0.0.0 -RenderOffscreen
```

---

## Cost Comparison

| Platform | GPU | Cost | Best For |
|----------|-----|------|----------|
| **Google Colab Free** | T4 | $0 | MVP testing, development |
| **Colab Pro** | T4/P100/V100 | $10/mo | Extended testing |
| **Paperspace A4000** | A4000 | $0.45/hr (~$324/mo 24/7) | Production |
| **AWS g4dn.xlarge** | T4 | $0.52/hr (~$374/mo 24/7) | Enterprise |

**Strategy**: 
1. **Develop on Colab** (free)
2. **Test on Colab Pro** ($10/mo)
3. **Deploy to Paperspace** for production ($108-243/mo with auto-shutdown)

---

## Next Steps After Colab Testing

Once your MVP works on Colab:

1. ✅ **Document latency metrics** (aim for <80ms)
2. ✅ **Test on mobile device** (not just simulator)
3. ✅ **Record demo video** for validation
4. ✅ **Deploy to Paperspace** for 24/7 access (see [PAPERSPACE_SETUP.md](./PAPERSPACE_SETUP.md))
5. ✅ **Set up CI/CD** for automated deployments

---

## Advanced: Persistent Storage

Google Drive can be used for persistent storage:

```python
# Mount Google Drive
from google.colab import drive
drive.mount('/content/drive')

# Save your project
!cp -r /content/portable-gaming-platform /content/drive/MyDrive/

# Load on next session
!cp -r /content/drive/MyDrive/portable-gaming-platform /content/
```

---

## Monitoring & Debugging

```python
# Install monitoring tools
!pip install psutil

import psutil

def system_stats():
    print(f"CPU: {psutil.cpu_percent()}%")
    print(f"RAM: {psutil.virtual_memory().percent}%")
    print(f"Disk: {psutil.disk_usage('/').percent}%")

system_stats()
```

---

## Security Notes

⚠️ **WARNING**: 
- Colab notebooks are public by default
- Don't commit JWT secrets or API keys
- Use environment variables or Google Secrets Manager
- ngrok tunnels are public—add authentication

---

## Support Resources

- **Google Colab FAQ**: https://research.google.com/colaboratory/faq.html
- **ngrok Docs**: https://ngrok.com/docs
- **UE Pixel Streaming**: https://docs.unrealengine.com/5.0/en-US/pixel-streaming
- **Our Project Issues**: https://github.com/YOUR_USERNAME/portable-gaming-platform/issues

---

## When to Move to Paperspace

Move from Colab to Paperspace when:
- ✅ MVP is validated and working
- ✅ Need 24/7 availability
- ✅ Have users waiting for access
- ✅ Session timeouts become problematic
- ✅ Ready to spend ~$0.45/hr for dedicated GPU

See [PAPERSPACE_SETUP.md](./PAPERSPACE_SETUP.md) for production deployment.
