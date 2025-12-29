# Cloud GPU Server Setup

## Requirements
- **Instance Type**: AWS G4dn.xlarge (or Paperspace A4000 equivalent).
- **OS**: Ubuntu 22.04 LTS (Jammy Jellyfish).
- **GPU Driver**: NVIDIA Drivers 535+ (Headless).

## Setup Steps

### 1. System Update
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential libvulkan1 curl docker.io
```

### 2. Install NVIDIA Container Toolkit
Follow official docs or:
```bash
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg \
  && curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

### 3. Unreal Engine Pixel Streaming
We will use a Docker container for the Pixel Streaming server infrastructure if not built-in, but typically for this custom stack, we run the UE5 application directly or in a container, communicating via our custom WebRTC bridge.

*Note: For Phase 1, ensure `nvidia-smi` returns valid GPU info.*

## Signaling
We are building a custom Node.js signaling server. Ensure port 8080 (TCP) and UDP ports for WebRTC (typically range 10000-60000) are open in the security group/firewall.
