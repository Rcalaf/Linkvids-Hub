# 🚀 Deployment Guide: Linkvids Platform

This guide outlines the step-by-step process to deploy the Linkvids Platform (Server, Client, and Database) to a production VPS using Docker and Nginx.

## ✅ Prerequisites

1.  **VPS (Virtual Private Server):** Ubuntu 22.04 or 24.04 LTS (DigitalOcean, AWS EC2, Linode, etc.).
2.  **Domain Name:** A domain pointing to your server's IP address.
3.  **SSH Access:** Root or sudo user privileges.

---

## Step 1: Server Preparation (Install Docker)

SSH into your server and install the Docker engine and Docker Compose plugin.

```bash
# Update package database
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL [https://download.docker.com/linux/ubuntu/gpg](https://download.docker.com/linux/ubuntu/gpg) | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository to Apt sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] [https://download.docker.com/linux/ubuntu](https://download.docker.com/linux/ubuntu) \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify installation
docker compose version
