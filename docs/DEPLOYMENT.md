# Production Deployment Guide

This guide walks you through deploying the Portable Gaming Platform to production.

## Prerequisites

- **For Development**: Google Colab account (FREE) - see [GOOGLE_COLAB_SETUP.md](./GOOGLE_COLAB_SETUP.md)
- **For Production**: Paperspace Gradient or AWS
- Docker & Docker Compose installed
- Domain name with DNS configured (production only)
- SSL certificate (Let's Encrypt recommended)

## Step 1: Server Setup

### Option A: DigitalOcean (Recommended for MVP)

```bash
# Create a Droplet with Docker pre-installed
# Minimum: 2GB RAM, 1 vCPU

# SSH into your server
ssh root@your-server-ip

# Clone the repository
git clone https://github.com/your-repo/portable-gaming-platform.git
cd portable-gaming-platform
```

### Option B: AWS EC2

```bash
# Launch an EC2 instance (t3.small minimum)
# Use Amazon Linux 2 or Ubuntu 22.04

# Install Docker
sudo yum install docker -y  # Amazon Linux
sudo apt install docker.io -y  # Ubuntu

sudo systemctl start docker
sudo systemctl enable docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## Step 2: Configure Environment

```bash
# Copy and edit environment file
cp .env.example .env
nano .env
```

**Required changes for production:**

```env
NODE_ENV=production
JWT_SECRET=<generate-a-strong-random-key>
CORS_ORIGINS=https://your-domain.com
VITE_SIGNALING_URL=wss://your-domain.com:8080
VITE_SESSION_URL=https://your-domain.com:3000
```

Generate a secure JWT secret:
```bash
openssl rand -base64 32
```

## Step 3: SSL Setup (Optional but Recommended)

### Using Nginx as Reverse Proxy with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d your-domain.com

# Configure Nginx to proxy to Docker services
```

## Step 4: Deploy with Docker

```bash
# Build and start all services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Check health endpoints
curl http://localhost:8080/health
curl http://localhost:3000/health
```

## Step 5: Verify Deployment

1. Open `https://your-domain.com` in a browser
2. Install the mobile app via TestFlight/Internal Testing
3. Connect and verify WebRTC streaming works

## Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Enable HTTPS/WSS
- [ ] Configure firewall (allow 80, 443, 8080, 3000)
- [ ] Set up monitoring (e.g., Datadog, CloudWatch)
- [ ] Enable log aggregation
- [ ] Configure backup for PostgreSQL

## Scaling

### Horizontal Scaling

For higher load, deploy multiple signaling servers behind a load balancer:

```yaml
# docker-compose.scale.yml
services:
  signaling:
    deploy:
      replicas: 3
```

### GPU Instances (For Unreal Engine)

For game streaming:

**Development/Testing (FREE)**
- **Google Colab: T4 GPU (FREE) - RECOMMENDED FOR MVP**
- See [GOOGLE_COLAB_SETUP.md](./GOOGLE_COLAB_SETUP.md)

**Production (Paid)**
- **Paperspace Gradient: A4000 (~$0.45/hr) - RECOMMENDED**
- AWS: g4dn.xlarge (1x T4, ~$0.52/hr, requires approval)
- GCP: n1-standard-4 + T4 (~$0.50/hr)

See [PAPERSPACE_SETUP.md](./PAPERSPACE_SETUP.md) for production deployment.

## Troubleshooting

### WebSocket Connection Fails
- Check CORS_ORIGINS includes your domain
- Verify firewall allows port 8080
- Check SSL certificate is valid

### Mobile App Can't Connect
- Update `EXPO_PUBLIC_SIGNALING_URL` in .env
- Rebuild with EAS: `npx eas build --platform ios`

### Health Check Fails
```bash
# Check container logs
docker-compose logs signaling
docker-compose logs session
```
