# 🚀 Deployment Guide: Linkvids Platform

This guide outlines the step-by-step process to deploy the Linkvids Platform (Server, Client, and Database) to a production VPS using Docker and Nginx or Apache.

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
```
---

## Step 2: Clone Repository

Navigate to the home directory and clone the project.

```bash
cd /home
# Replace with your actual repo URL
git clone [https://github.com/your-org/linkvids-platform.git](https://github.com/your-org/linkvids-platform.git)
cd linkvids-platform
```
---
## Step 3: Configure Environment Variables

Create the `.env` file in the project root. This file is **not** tracked by git for security reasons.

```bash
nano .env
```

```bash
# --- General Config ---
NODE_ENV=production

# --- Database ---
# Hostname 'mongo' matches the service name in docker-compose.yml
MONGO_URI=mongodb://mongo:27017/linkvids

# --- Server (Backend) ---
PORT=5000
# Generate a secure secret: openssl rand -base64 32
JWT_SECRET=replace_this_with_a_secure_random_string

# --- Client (Frontend) ---
# Used for CORS configuration
CLIENT_URL=[https://linkvids.com](https://linkvids.com)

# --- External Services (Optional) ---
# AWS_ACCESS_KEY_ID=...
# STRIPE_SECRET_KEY=...

```
---
## Step 4: DNS Configuration

Go to your Domain Registrar (Namecheap, GoDaddy, Cloudflare, etc.) and add the following **A Records**:

| Type | Host | Value | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `<YOUR_SERVER_IP>` | Automatic |
| **A** | `www` | `<YOUR_SERVER_IP>` | Automatic |

---

## Step 5: Setup Reverse Proxy

We use a web server on the host to route traffic from public ports (80/443) to the internal Docker containers. Choose **one** of the options below.

### Option A: Nginx (Recommended)

**1. Install Nginx**
```bash
sudo apt update
sudo apt install nginx -y
```

**2. Configure Site (Nginx)**

Create a new configuration file:

```bash
sudo nano /etc/nginx/sites-available/linkvids
```

Paste the following configuration (ensure ports 3000 and 5000 match your Docker setup):

```bash
server {
    listen 80;
    server_name linkvids.com www.linkvids.com;

    # Frontend (Client)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proy_cache_bypass $http_upgrade;
    }

    # Backend (Server API)
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**3. Enable and Restart (Nginx)**

```bash
sudo ln -s /etc/nginx/sites-available/linkvids /etc/nginx/sites-enabled/

# Remove default config if it exists
sudo rm /etc/nginx/sites-enabled/default

sudo systemctl restart nginx
```

### Option B: Apache

**1. Install Nginx**

```bash
sudo apt update
sudo apt install apache2 -y
```
**2. Enable Proxy Modules**

Apache requires specific modules to handle proxying.

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo systemctl restart apache2
```

**3. Configure Site (Apache)**

Create a new virtual host file:

```bash
sudo nano /etc/apache2/sites-available/linkvids.conf
```

Paste the following configuration:

```bash
<VirtualHost *:80>
    ServerName linkvids.com
    ServerAlias www.linkvids.com

    # Frontend (Client)
    ProxyPreserveHost On
    ProxyPass /api http://localhost:5000/api
    ProxyPassReverse /api http://localhost:5000/api

    # Backend (Server API) - Order matters! Catch-all / goes last
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    ErrorLog ${APACHE_LOG_DIR}/linkvids-error.log
    CustomLog ${APACHE_LOG_DIR}/linkvids-access.log combined
</VirtualHost>
```
**4. Enable and Restart (Apache)**

```bash
sudo a2ensite linkvids.conf

# Disable default site if desired
sudo a2dissite 000-default.conf

sudo systemctl reload apache2
```

---

## Step 6: Deploy Containers
Build the Docker images and start the services in the background.
Run these commands from the root of your project directory (`/home/linkvids-platform`) to build the images and start the services.

```bash
# 1. Ensure you are in the project folder
cd /home/linkvids-platform

# 2. Build images and start containers in the background
docker compose up -d --build

# 3. Verify that all containers (Server, Client, Mongo) are 'Up'
docker compose ps
```
---
## Step 7: Setup SSL (HTTPS)
Secure the application with a free Let's Encrypt certificate using Certbot.

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate Certificate
sudo certbot --nginx -d linkvids.com -d [www.linkvids.com](https://www.linkvids.com)
```

Select option "2" if asked to redirect HTTP traffic to HTTPS.

---

## Step 8: Security Firewall (UFW)

Enable the Uncomplicated Firewall (UFW) to block unauthorized ports. You must configure this based on which web server (dispatcher) you chose in Step 5.

**1. Allow SSH (CRITICAL)**
First, strictly allow SSH connections. If you skip this, you will lock yourself out of the server when you enable the firewall.

```bash
sudo ufw allow OpenSSH
```

**2. Allow Web Traffic**

Choose the command matching your web server:

- Option A: If using Nginx
  
  ```bash
  sudo ufw allow 'Nginx Full'
  ```

- Option B: If using Apache

  ```bash
  sudo ufw allow 'Apache Full'
  ```

**3. Enable Firewall Activate the firewall rules.**

```bash
sudo ufw enable
```

**4. Check Status Verify that SSH and your web server are the only allowed apps.**

```bash
sudo ufw status
```

## Step 8: Security Firewall (iptables)

If your server uses raw `iptables` instead of UFW, follow these steps to secure the server.

**1. Allow Established Connections & Loopback**
Ensure existing connections aren't cut off and the system can talk to itself.
```bash
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A INPUT -i lo -j ACCEPT
```

**2. Allow SSH (CRITICAL) **
You must allow port 22 (or your custom SSH port) before blocking anything else.

```bash
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
```

**3. Allow Web Traffic (HTTP & HTTPS)**
Allow traffic for Nginx or Apache.

```bash
# Allow HTTP (Port 80)
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT

# Allow HTTPS (Port 443)
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

**4. Drop All Other Traffic**
Set the default policy to drop incoming traffic that doesn't match the rules above.

```bash
sudo iptables -P INPUT DROP
```

**5. Make Rules Persistent**
By default, iptables rules are lost on reboot. Install iptables-persistent to save them.

```bash
# Install the persistent package
sudo apt-get install iptables-persistent -y

# Save the current rules
sudo netfilter-persistent save
```

---

## 🛠 Maintenance & Updates

To update the application after pushing new code to GitHub:

```bash
# 1. Pull latest code
git pull origin main

# 2. Rebuild and restart containers
docker compose up -d --build

# 3. Prune old images (optional, saves space)
docker image prune -f
```

To view logs:

```bash
docker compose logs -f server
# or
docker compose logs -f client
```

## (Optional) Step 9: Automate Deployment with GitHub Actions

You can configure GitHub to automatically deploy your changes to the server whenever you push to the `main` branch.

**1. Generate SSH Keys**
On your **local machine**, generate a new SSH key pair strictly for GitHub Actions.
```bash
ssh-keygen -t rsa -b 4096 -C "github-actions" -f ./github_deploy_key
```

- Private Key: `github_deploy_key` (You will paste this into GitHub Secrets)
- Public Key: `github_deploy_key.pub` (You will paste this onto your VPS)

**2. Configure the Server (VPS)**
Add the Public Key to the `authorized_keys` on your server to allow GitHub to log in.

On your VPS:
```bash
# Open authorized_keys
nano ~/.ssh/authorized_keys
```

Paste the content of `github_deploy_key.pub` on a new line, save, and exit.

### 3. Configure GitHub Secrets

1.  Go to your **GitHub Repository** > **Settings** > **Secrets and variables** > **Actions**.
2.  Click **New repository secret** and add the following:

| Secret Name | Value |
| :--- | :--- |
| `SSH_HOST` | Your VPS IP address (e.g., `192.168.1.1`) |
| `SSH_USERNAME` | Your VPS username (e.g., `root`) |
| `SSH_KEY` | Paste the **Private Key** content (`github_deploy_key`) |

### 4. Create the Workflow File

In your repository, create the directory path `.github/workflows/` and add a file named `deploy.yml`.

**File:** `.github/workflows/deploy.yml`

```yaml

name: Deploy Production

on:
  push:
    branches: [ "main" ]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      # 1. Checkout Code
      - name: Checkout Code
        uses: actions/checkout@v4

      # 2. Build Server Image
      - name: Build Server Docker Image
        run: |
          docker build -t linkvids-server:latest ./server
      
      - name: Create Env File
        env:
          VAL_DATABASE_URI: ${{ secrets.DATABASE_URI }}
          VAL_ACCESS_TOKEN: ${{ secrets.ACCESS_TOKEN_SECRET }}
          VAL_REFRESH_TOKEN: ${{ secrets.REFRESH_TOKEN_SECRET }}
          VAL_CLIENT_URL: ${{ secrets.CLIENT_URL }}
          VAL_OVH_ENDPOINT: ${{ secrets.OVH_ENDPOINT }}
          VAL_OVH_REGION: ${{ secrets.OVH_REGION }}
          VAL_OVH_BUCKET: ${{ secrets.OVH_BUCKET_NAME }}
          VAL_OVH_ACCESS: ${{ secrets.OVH_ACCESS_KEY }}
          VAL_OVH_SECRET: ${{ secrets.OVH_SECRET_KEY }}
          VAL_EMAIL_USER: ${{ secrets.EMAIL_USER }}
          VAL_EMAIL_PASS: ${{ secrets.EMAIL_PASS }}
          VAL_EMAIL_FROM: ${{ secrets.EMAIL_FROM }}
        run: |
          touch .env.production
          echo "NODE_ENV=production" >> .env.production
          echo "PORT=3500" >> .env.production
          echo "DATABASE_URI=$VAL_DATABASE_URI" >> .env.production
          echo "ACCESS_TOKEN_SECRET=$VAL_ACCESS_TOKEN" >> .env.production
          echo "REFRESH_TOKEN_SECRET=$VAL_REFRESH_TOKEN" >> .env.production
          echo "CLIENT_URL=$VAL_CLIENT_URL" >> .env.production
          echo "OVH_ENDPOINT=$VAL_OVH_ENDPOINT" >> .env.production
          echo "OVH_REGION=$VAL_OVH_REGION" >> .env.production
          echo "OVH_BUCKET_NAME=$VAL_OVH_BUCKET" >> .env.production
          echo "OVH_ACCESS_KEY=$VAL_OVH_ACCESS" >> .env.production
          echo "OVH_SECRET_KEY=$VAL_OVH_SECRET" >> .env.production
          echo "EMAIL_USER=$VAL_EMAIL_USER" >> .env.production
          echo "EMAIL_PASS=$VAL_EMAIL_PASS" >> .env.production
          echo "EMAIL_FROM=$VAL_EMAIL_FROM" >> .env.production
      
      # 3. Build Client Image
      - name: Build Client Docker Image
        run: |
          docker build \
          --build-arg VITE_API_URL=https://hub-api.linkvids.io/api \
          -t linkvids-client:latest ./client

      # 4. Save Images to Tarballs (Compressing to save bandwidth)
      - name: Save Docker Images
        run: |
          docker save linkvids-server:latest | gzip > server-image.tar.gz
          docker save linkvids-client:latest | gzip > client-image.tar.gz

      # 5. Copy Files to Server (Images + Compose File)
      - name: Copy Files to Server
        uses: appleboy/scp-action@v0.1.4
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          source: "server-image.tar.gz,client-image.tar.gz,docker-compose.prod.yml,.env.production"
          target: "/home/hub.linkvids"

      # 6. SSH Deploy Command
      - name: Deploy on Server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /home/hub.linkvids

            # A. Load the new images from the tarballs
            echo "Loading Server image..."
            gunzip -c server-image.tar.gz | docker load
            echo "Loading Client image..."
            gunzip -c client-image.tar.gz | docker load

            # B. Create .env file from GitHub Secrets (Secure)
            mkdir -p server
            mv .env.production server/.env

            # C. Restart Containers
            # We explicitly tell compose to use the images we just loaded
            docker compose -f docker-compose.prod.yml down
            docker compose -f docker-compose.prod.yml up -d --remove-orphans

            # D. Cleanup to save disk space
            rm -f server-image.tar.gz client-image.tar.gz
            docker image prune -f
```

### 5. Commit and Push

Commit the workflow file to GitHub.

```bash
git add .github/workflows/deploy.yml
git commit -m "Add automated deployment pipeline"
git push origin main
