# AWS Free Tier Deployment Guide

## Step 1: Sign Up for AWS

1. Go to [aws.amazon.com/free](https://aws.amazon.com/free/)
2. Click **"Create a Free Account"**
3. Enter email, password, and account name
4. Add payment method (won't be charged unless you exceed free tier)
5. Verify phone number
6. Select **Basic Support (Free)**

> **You get $300 in credits for 90 days!**

---

## Step 2: Request GPU Instance Access

GPU instances require approval (takes 1-24 hours):

1. Go to **Service Quotas** → **EC2**
2. Search for `g4dn.xlarge`
3. Request increase to **1** instance
4. Wait for approval email

---

## Step 3: Launch GPU Instance

Once approved:

1. Go to **EC2** → **Launch Instance**
2. Configure:
   - **Name**: `pixel-streaming-server`
   - **AMI**: Windows Server 2022 with NVIDIA Gaming
   - **Instance type**: `g4dn.xlarge` (~$0.50/hr)
   - **Key pair**: Create new one (save the .pem file!)
   - **Security group**: Allow ports 8080, 3000, 3478

3. Click **Launch Instance**

---

## Step 4: Connect & Install

1. Wait 5 min for instance to start
2. Get Windows password: EC2 → Instance → Connect → RDP Client
3. Download RDP file and connect
4. Install:
   - Unreal Engine 5.3+
   - Your game project
   - Node.js 20+

---

## Step 5: Deploy Our Services

On the Windows instance:

```powershell
# Clone the project
git clone https://github.com/YOUR_REPO/portable-gaming-platform.git
cd portable-gaming-platform

# Install dependencies
npm install

# Start services
cd server/signaling && npm run dev
cd ../session && npm run dev
```

---

## Step 6: Update Client URLs

Update your `.env` file with AWS public IP:

```env
VITE_SIGNALING_URL=ws://YOUR_AWS_PUBLIC_IP:8080
VITE_SESSION_URL=http://YOUR_AWS_PUBLIC_IP:3000
```

---

## Step 7: Run Pixel Streaming

On the GPU instance, launch your UE project:

```batch
YourGame.exe -PixelStreamingURL=ws://localhost:8080 -RenderOffscreen
```

---

## Cost Estimate

| Resource | Cost |
|----------|------|
| g4dn.xlarge | ~$0.50/hr |
| With $300 credits | **600 hours free!** |

---

## Security Group Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 8080 | TCP | Signaling WebSocket |
| 3000 | TCP | Session API |
| 3478 | UDP/TCP | TURN server |
| 3389 | TCP | RDP (remote desktop) |
