# Paperspace Gradient Deployment Guide

Deploy the Portable Gaming Platform on Paperspace Gradient GPU instances for Unreal Engine streaming.

## Why Paperspace Gradient?

- **Fast GPU provisioning** (minutes vs hours for AWS approval)
- **Pre-configured NVIDIA drivers** and Docker support
- **Simple pricing**: ~$0.45/hr for A4000, ~$0.76/hr for A5000
- **No approval required** for GPU instances
- **Persistent storage** included
- **Better than AWS** for ML/gaming workloads

---

## Step 1: Sign Up for Paperspace

1. Go to [console.paperspace.com](https://console.paperspace.com)
2. Sign up with email or GitHub
3. Add payment method (first $10 free credit)
4. No GPU approval needed—instant access!

---

## Step 2: Create a GPU Instance

### Via Gradient Dashboard

1. Navigate to **Gradient** → **Machines**
2. Click **Create Machine**
3. Configuration:
   - **Name**: `pixel-streaming-gpu`
   - **Region**: NY2 or CA1 (lowest latency to your users)
   - **Machine Type**: A4000 (recommended) or A5000
   - **OS Template**: Ubuntu 22.04 + NVIDIA Docker
   - **Storage**: 100GB SSD minimum
   - **Public IP**: Enable
   - **Auto-shutdown**: 2 hours (save costs during testing)

4. Click **Create** and wait ~2 minutes

### Via Paperspace CLI (Advanced)

```bash
# Install CLI
npm install -g paperspace-node

# Login
paperspace login

# Create machine
paperspace machines create \
  --region "NY2" \
  --machineType "A4000" \
  --size 100 \
  --templateId "t5xjt8e" \
  --name "pixel-streaming-gpu" \
  --publicIp true
```

---

## Step 3: Connect to Your Instance

Get SSH credentials from dashboard:

```bash
# Copy SSH command from Paperspace dashboard
ssh paperspace@<your-public-ip>

# Or use the provided key
ssh -i ~/.ssh/paperspace_id_rsa paperspace@<your-public-ip>
```

---

## Step 4: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose (if not pre-installed)
sudo apt install docker.io docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify NVIDIA GPU is available
nvidia-smi
# Should show A4000 or A5000

# Test Docker GPU access
sudo docker run --rm --gpus all nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi
```

---

## Step 5: Install Unreal Engine

### Option A: Unreal Engine 5.4 (Recommended)

```bash
# Download Epic Games Launcher for Linux
wget -O UnrealEngine.tar.gz https://cdn2.unrealengine.com/Unreal+Engine%2FLinuxNoEditor-5.4.0-release.tar.gz

# Extract
tar -xzf UnrealEngine.tar.gz -C ~/

# Or use Docker image (preferred)
docker pull ghcr.io/epicgames/unreal-engine:runtime-pixel-streaming-5.4
```

### Option B: Pixel Streaming Ready Container

```bash
# Pull pre-configured UE5 + Pixel Streaming container
docker pull adamrehn/ue4-runtime:latest

# Or build custom image with your game
# See: https://github.com/adamrehn/ue4-docker
```

---

## Step 6: Deploy Our Platform Services

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/portable-gaming-platform.git
cd portable-gaming-platform

# Create environment file
cat > .env << EOF
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 32)
CORS_ORIGINS=https://*.paperspace.com
SIGNALING_PORT=8080
SESSION_PORT=3000
VITE_SIGNALING_URL=wss://$(curl -s ifconfig.me):8080
VITE_SESSION_URL=https://$(curl -s ifconfig.me):3000
GPU_ENABLED=true
NVENC_CODEC=h265
EOF

# Install dependencies
npm install --workspaces

# Build Docker images
docker-compose build

# Start services
docker-compose up -d

# Verify health
curl http://localhost:8080/health
curl http://localhost:3000/health
```

---

## Step 7: Configure Firewall

```bash
# Allow required ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 8080/tcp  # Signaling WebSocket
sudo ufw allow 3000/tcp  # Session API
sudo ufw allow 3478/udp  # STUN/TURN
sudo ufw allow 8888/tcp  # Pixel Streaming (Unreal)
sudo ufw enable
```

---

## Step 8: Launch Unreal Engine with Pixel Streaming

### Using Packaged Game

```bash
cd ~/YourUnrealProject/LinuxNoEditor

# Launch with Pixel Streaming flags
./YourGame.sh \
  -PixelStreamingIP=0.0.0.0 \
  -PixelStreamingPort=8888 \
  -RenderOffscreen \
  -NVENC \
  -NvEncCodec=h265 \
  -PixelStreamingEncoderRateControl=CBR \
  -PixelStreamingEncoderTargetBitrate=10000000 \
  -PixelStreamingEncoderMaxBitrate=20000000
```

### Using Docker

```bash
# Create docker-compose.unreal.yml
cat > docker-compose.unreal.yml << EOF
version: '3.8'
services:
  unreal-game:
    image: your-custom-ue5-image:latest
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - NVIDIA_DRIVER_CAPABILITIES=graphics,video,compute,utility
    ports:
      - "8888:8888"
    volumes:
      - ./game-data:/data
    command: >
      /Game/Binaries/Linux/YourGame
      -PixelStreamingIP=0.0.0.0
      -PixelStreamingPort=8888
      -RenderOffscreen
      -NVENC
EOF

# Launch
docker-compose -f docker-compose.unreal.yml up -d
```

---

## Step 9: Update Client Configuration

Update your mobile app and browser client to point to Paperspace instance:

```bash
# Get your public IP
PUBLIC_IP=$(curl -s ifconfig.me)
echo "Your Paperspace IP: $PUBLIC_IP"

# Update .env files
cat > client-phone-rn/.env << EOF
EXPO_PUBLIC_SIGNALING_URL=wss://$PUBLIC_IP:8080
EXPO_PUBLIC_SESSION_URL=https://$PUBLIC_IP:3000
EOF

cat > browser-client/.env << EOF
VITE_SIGNALING_URL=wss://$PUBLIC_IP:8080
VITE_SESSION_URL=https://$PUBLIC_IP:3000
EOF
```

---

## Step 10: Test End-to-End

1. **Open browser client**: `http://<paperspace-ip>:5173`
2. **Launch mobile app**: Connect to signaling server
3. **Verify WebRTC**: Check for video stream in browser
4. **Test input**: Touch controls on phone should control game

---

## Performance Optimization

### GPU Settings

```bash
# Set GPU to performance mode
sudo nvidia-smi -pm 1

# Set max power limit
sudo nvidia-smi -pl 140  # A4000: 140W, A5000: 230W

# Lock GPU clock for consistent latency
sudo nvidia-smi -lgc 1560  # A4000 boost clock
```

### Encoder Settings (in Unreal)

Edit `YourProject/Config/DefaultEngine.ini`:

```ini
[/Script/PixelStreaming.PixelStreamingSettings]
EncoderTargetBitrate=10000000
EncoderMaxBitrate=20000000
WebRTCMinBitrate=1000000
WebRTCMaxBitrate=20000000
CaptureUseFence=True
EncoderCodec=H265
EncoderLatencyMode=LowLatency
```

---

## Monitoring

### Install monitoring stack

```bash
# Prometheus + Grafana for metrics
docker-compose -f monitoring/docker-compose.yml up -d

# View dashboards
# Grafana: http://<paperspace-ip>:3001
# Prometheus: http://<paperspace-ip>:9090
```

### GPU Monitoring

```bash
# Watch GPU utilization
watch -n 1 nvidia-smi

# Log GPU metrics
nvidia-smi dmon -s pucvmet -c 100 > gpu_metrics.log
```

---

## Cost Management

### Automatic Shutdown

```bash
# Install auto-shutdown script
cat > /home/paperspace/auto-shutdown.sh << 'EOF'
#!/bin/bash
# Shutdown if no active connections for 30 minutes
if ! pgrep -f "UnrealGame" > /dev/null; then
  sudo shutdown -h now
fi
EOF

chmod +x /home/paperspace/auto-shutdown.sh

# Add to crontab (check every 30 min)
(crontab -l 2>/dev/null; echo "*/30 * * * * /home/paperspace/auto-shutdown.sh") | crontab -
```

### Paperspace API Shutdown

```bash
# Stop machine via API when not in use
paperspace machines stop --machineId <your-machine-id>

# Start when needed
paperspace machines start --machineId <your-machine-id>
```

---

## Cost Estimate

| GPU Type | vCPU | RAM | GPU VRAM | Price/hr | Monthly (24/7) |
|----------|------|-----|----------|----------|----------------|
| A4000 | 8 | 45GB | 16GB | $0.45 | ~$324 |
| A5000 | 8 | 45GB | 24GB | $0.76 | ~$547 |
| RTX 4000 | 8 | 30GB | 8GB | $0.51 | ~$367 |

**With auto-shutdown at 8hrs/day**: ~$108-243/month

**Free tier**: $10 credit = ~22 hours on A4000

---

## Troubleshooting

### GPU Not Detected

```bash
# Check NVIDIA driver
nvidia-smi

# Reinstall driver if needed
sudo apt purge nvidia-* -y
sudo apt install nvidia-driver-525 -y
sudo reboot
```

### WebRTC Connection Failed

```bash
# Check signaling server logs
docker-compose logs -f signaling

# Verify ports are open
sudo netstat -tulpn | grep -E '8080|3000|8888'

# Test WebSocket connection
curl --include \
     --no-buffer \
     --header "Connection: Upgrade" \
     --header "Upgrade: websocket" \
     http://localhost:8080/
```

### High Latency (>120ms)

1. **Check region**: Use Paperspace region closest to users
2. **Reduce bitrate**: Lower `EncoderTargetBitrate` in UE settings
3. **Disable VSync**: Add `-NoVSync` flag to Unreal launch
4. **Enable GPU clocking**: Lock GPU to max frequency
5. **Check network**: Use `ping` and `mtr` to diagnose

```bash
# Test latency to Paperspace
ping -c 100 <paperspace-ip>

# Traceroute analysis
mtr --report --report-cycles 100 <paperspace-ip>
```

---

## Scaling to Multiple Instances

### Gradient Deployment (Kubernetes)

```yaml
# gradient-deployment.yaml
apiVersion: v1
kind: Deployment
metadata:
  name: pixel-streaming
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pixel-streaming
  template:
    metadata:
      labels:
        app: pixel-streaming
    spec:
      containers:
      - name: unreal-game
        image: your-ue5-image:latest
        resources:
          limits:
            nvidia.com/gpu: 1
        ports:
        - containerPort: 8888
```

Deploy:

```bash
paperspace-gradient deployments create \
  --name pixel-streaming \
  --machineType A4000 \
  --container your-ue5-image:latest \
  --replicas 3
```

---

## Next Steps

1. ✅ **Set up SSL**: Use Caddy or nginx with Let's Encrypt
2. ✅ **Add load balancer**: Cloudflare or Paperspace LB
3. ✅ **Implement session queuing**: Redis-based matchmaking
4. ✅ **Add CDN**: Cloudflare R2 for assets
5. ✅ **Monitor costs**: Set billing alerts in Paperspace

---

## Support Resources

- **Paperspace Docs**: https://docs.paperspace.com
- **Gradient API**: https://docs.paperspace.com/gradient/
- **Community**: https://community.paperspace.com
- **UE Pixel Streaming**: https://docs.unrealengine.com/5.0/en-US/pixel-streaming

---

## Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Enable UFW firewall
- [ ] Set up SSH key-only auth
- [ ] Enable HTTPS/WSS with SSL certificate
- [ ] Restrict CORS origins
- [ ] Set up monitoring and alerting
- [ ] Enable automatic backups
- [ ] Use Paperspace private networking for services
