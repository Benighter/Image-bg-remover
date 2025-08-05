# SSH GitHub Connection Setup Guide

## 🎯 Quick Solution (Hybrid Multi-Account Setup)

**TL;DR**: Optimal setup for working with both personal (Benighter) and organization (MehloNkolele) accounts:

- **Personal repos (Benighter)**: SSH by default (works everywhere)
- **Work repos (MehloNkolele)**: HTTPS (works even without Absa WiFi)

### One-Command Setup

```bash
# Run the automated hybrid setup
powershell -ExecutionPolicy Bypass -File setup_hybrid_git_config.ps1
```

### Manual Setup (if needed)

```bash
# 1. Create multi-account SSH config
powershell -Command "@'
# Personal GitHub account (Benighter) - Default
Host github.com
  HostName github.com
  Port 22
  User git
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
  AddKeysToAgent yes

# Organization GitHub account (MehloNkolele) - SSH fallback
Host github.com-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_mehlo
  IdentitiesOnly yes
  AddKeysToAgent yes
'@ | Out-File -FilePath ~/.ssh/config -Encoding ASCII"

# 2. Set up HTTPS for work repos
git config --global credential.helper manager
git config --global url."https://github.com/absa-group/".insteadOf "git@github.com-work:absa-group/"

# 3. Test both accounts
ssh -T git@github.com        # Should show: Hi Benighter!
ssh -T git@github.com-work   # Should show: Hi MehloNkolele!
```

### Usage Examples

**Personal repos (SSH):**
```bash
git clone git@github.com:Benighter/repo-name.git
# Works everywhere, uses SSH key authentication
```

**Work repos (HTTPS):**
```bash
git clone https://github.com/absa-group/repo-name.git
# Works even without Absa WiFi, uses credential manager
```

### Benefits

✅ **Personal repos**: Fast SSH authentication
✅ **Work repos**: Network-friendly HTTPS
✅ **VS Code integration**: Automatic configuration
✅ **No manual switching**: Works seamlessly across all Git clients

---

## Problem Description

When trying to push code to GitHub using SSH, encountered the following issues:

1. **Connection Reset Error**: `Connection reset by 20.87.245.4 port 443`
2. **Email Privacy Restrictions**: `GH007: Your push would publish a private email address`
3. **SSH Authentication Failures**: Unable to authenticate with GitHub via SSH
4. **Repository Not Found**: `remote: Repository not found` when pushing to organization repositories
5. **Malformed HTTPS URLs**: Git config automatically adding `:443` to HTTPS URLs
6. **Wrong SSH Key**: Using personal SSH key instead of organization-authorized key

## Root Causes

### 1. SSH Configuration Issues
- SSH config was using `ssh.github.com` on port 443
- Connection was being reset during key exchange
- Network/firewall blocking the connection

### 2. Email Privacy Settings
- Git was configured with personal email (`bennet.nkolele1998@gmail.com`)
- GitHub privacy settings prevent pushing commits with private emails
- Need to use GitHub's noreply email format

### 3. Organization Repository Access Issues
- Using personal SSH key instead of organization-authorized key
- Git configured with wrong remote URL format
- URL rewrite rules causing malformed HTTPS URLs (adding `:443`)
- Need to authenticate with organization account (e.g., `mehlo.nkolele@absa.africa`)

### 4. Multiple GitHub Account Management
- Personal account (`Benighter`) vs organization account (`MehloNkolele`)
- Different SSH keys for different accounts
- GitHub CLI authentication with multiple accounts

## Solution Steps

### Step 1: Fix SSH Configuration (Multi-Account Setup)

**Problem**: SSH connection failing or using wrong account
**Solution**: Update SSH config to handle multiple GitHub accounts seamlessly

```bash
# Location: ~/.ssh/config
# Multi-account SSH configuration

# Personal GitHub account (Benighter)
Host github.com-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
  AddKeysToAgent yes

# Organization GitHub account (MehloNkolele)
Host github.com-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_mehlo
  IdentitiesOnly yes
  AddKeysToAgent yes

# Default GitHub configuration (for personal account - Benighter)
Host github.com
  HostName github.com
  Port 22
  User git
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
  AddKeysToAgent yes
  ServerAliveInterval 60
  ServerAliveCountMax 10
```

**PowerShell command to create multi-account config:**
```powershell
@'
# Personal GitHub account (Benighter)
Host github.com-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
  AddKeysToAgent yes

# Organization GitHub account (MehloNkolele)
Host github.com-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_mehlo
  IdentitiesOnly yes
  AddKeysToAgent yes

# Default GitHub configuration (for personal account - Benighter)
Host github.com
  HostName github.com
  Port 22
  User git
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
  AddKeysToAgent yes
  ServerAliveInterval 60
  ServerAliveCountMax 10
'@ | Out-File -FilePath ~/.ssh/config -Encoding ASCII
```

### Step 2: Test SSH Connection (Multi-Account)

**Test Personal Account (Benighter):**
```bash
ssh -T git@github.com
# OR explicitly test personal
ssh -T git@github.com-personal
```

**Expected successful output:**
```text
Hi Benighter! You've successfully authenticated, but GitHub does not provide shell access.
```

**Test Organization Account (MehloNkolele):**
```bash
ssh -T git@github.com-work
```

**Expected successful output:**
```text
Hi MehloNkolele! You've successfully authenticated, but GitHub does not provide shell access.
```

### Step 3: Configure Git Email

**Problem**: Using private email address
**Solution**: Use GitHub noreply email

```bash
# Set GitHub noreply email (format: [user-id]+[username]@users.noreply.github.com)
git config user.email "111303968+Benighter@users.noreply.github.com"
git config user.name "Benighter"
```

### Step 4: Fix Existing Commits

If you have commits with the wrong email, amend the last commit:

```bash
git commit --amend --reset-author --no-edit
```

### Step 5: Add SSH Remote and Set Upstream (Multi-Account)

**For Personal Repositories (Benighter):**
```bash
# Add SSH remote for personal account (uses default github.com)
git remote add origin git@github.com:Benighter/[repository].git

# Set upstream tracking for easy pushing
git branch --set-upstream-to=origin/main main

# Push to personal repository
git push origin main

# After upstream is set, you can just use:
git push
```

**For Organization Repositories (MehloNkolele):**
```bash
# Add SSH remote for organization account (uses github.com-work)
git remote add origin git@github.com-work:absa-group/[repository].git

# Set upstream tracking for easy pushing
git branch --set-upstream-to=origin/main main

# Push to organization repository
git push origin main

# After upstream is set, you can just use:
git push
```

## Hybrid Multi-Account Setup (BEST Solution) 🌟

### Overview

This is the optimal setup that combines the best of both worlds:
- **Personal repos (Benighter)**: SSH for fast, secure authentication
- **Work repos (MehloNkolele)**: HTTPS for maximum network compatibility

### Why This Approach?

1. **SSH for Personal**: Fast, secure, works everywhere
2. **HTTPS for Work**: Bypasses corporate firewalls and VPN restrictions
3. **Automatic Selection**: Git automatically chooses the right protocol
4. **VS Code Integration**: Works seamlessly in all editors and IDEs
5. **Network Agnostic**: Work repos accessible from any network

### Complete Setup Script

Run this single command to set up everything:

```bash
powershell -ExecutionPolicy Bypass -File setup_hybrid_git_config.ps1
```

### What the Script Does

1. **SSH Configuration**: Sets up SSH keys for both accounts
2. **HTTPS Configuration**: Configures credential manager for work repos
3. **URL Rewriting**: Automatically converts work SSH URLs to HTTPS
4. **Directory-Based Config**: Different Git settings based on folder location
5. **VS Code Integration**: Updates VS Code settings for Git multi-account support

### Directory Structure

```
C:\Users\AB038N8\OneDrive - Absa\Desktop\Programming\
├── BG remover\          # Personal projects (uses SSH)
├── Other-Personal\      # Personal projects (uses SSH)
└── Work\               # Work projects (uses HTTPS + work email)
```

### Usage Examples

**Personal Repository Workflow:**
```bash
# Clone anywhere (uses SSH automatically)
git clone git@github.com:Benighter/repo-name.git

# Or from any location
cd "C:\Users\AB038N8\OneDrive - Absa\Desktop\Programming\MyProject"
git remote add origin git@github.com:Benighter/repo-name.git
git push  # Uses SSH, Benighter account
```

**Work Repository Workflow:**
```bash
# Clone into Work directory (uses HTTPS automatically)
cd "C:\Users\AB038N8\OneDrive - Absa\Desktop\Programming\Work"
git clone https://github.com/absa-group/repo-name.git

# Git automatically uses:
# - HTTPS protocol (works from any network)
# - mehlo.nkolele@absa.africa email
# - Credential manager for authentication
```

### Verification Commands

```bash
# Test personal SSH
ssh -T git@github.com
# Expected: Hi Benighter! You've successfully authenticated...

# Test work SSH (fallback)
ssh -T git@github.com-work
# Expected: Hi MehloNkolele! You've successfully authenticated...

# Check current config
git config user.name    # Should show: Benighter (outside Work folder)
git config user.email   # Should show: 111303968+Benighter@users.noreply.github.com
```

## Multi-Account SSH Setup (Alternative Solution)

### Overview

This setup allows you to seamlessly work with both personal (Benighter) and organization (MehloNkolele) repositories without authentication conflicts. The configuration automatically uses the correct SSH key based on the repository URL.

### Key Benefits

1. **No manual account switching** - SSH automatically uses the right key
2. **Works with both accounts simultaneously** - No need to reconfigure
3. **Simple repository setup** - Just use the appropriate host in your remote URL
4. **Backward compatible** - Existing personal repos continue to work

### SSH Configuration Structure

```bash
# ~/.ssh/config

# Personal account (default for github.com)
Host github.com
  IdentityFile ~/.ssh/id_ed25519        # Benighter's key

# Organization account (explicit host)
Host github.com-work
  IdentityFile ~/.ssh/id_ed25519_mehlo  # MehloNkolele's key

# Optional: Explicit personal host
Host github.com-personal
  IdentityFile ~/.ssh/id_ed25519        # Benighter's key
```

### Usage Examples

**Personal Repository (Benighter):**
```bash
# Clone/add remote using default github.com
git clone git@github.com:Benighter/Image-bg-remover.git
git remote add origin git@github.com:Benighter/repo-name.git

# SSH will automatically use id_ed25519 (Benighter's key)
git push  # Works seamlessly
```

**Organization Repository (MehloNkolele):**
```bash
# Clone/add remote using github.com-work
git clone git@github.com-work:absa-group/repo-name.git
git remote add origin git@github.com-work:absa-group/repo-name.git

# SSH will automatically use id_ed25519_mehlo (MehloNkolele's key)
git push  # Works seamlessly
```

### Verification Commands

```bash
# Test personal account
ssh -T git@github.com
# Expected: Hi Benighter! You've successfully authenticated...

# Test organization account
ssh -T git@github.com-work
# Expected: Hi MehloNkolele! You've successfully authenticated...
```

## Organization Repository Setup (Absa Group Example)

### Problem: Repository Not Found for Organization Repos

When working with organization repositories (e.g., `absa-group/Alternative_Physical_Channels_QA`), you may encounter:

```
remote: Repository not found.
fatal: repository 'https://github.com/absa-group/Alternative_Physical_Channels_QA.git/' not found
```

### Solution: Multiple Account SSH Configuration

#### Step 1: Authenticate with GitHub CLI for Organization Account

```bash
# Refresh GitHub CLI authentication
gh auth refresh

# Check authentication status
gh auth status
```

Expected output should show your organization account as active:
```
✓ Logged in to github.com account MehloNkolele (keyring)
- Active account: true
```

#### Step 2: Configure SSH for Organization Account

Create/update SSH config to use the correct key for your organization account:

```bash
# Check available SSH keys and their fingerprints
ssh-keygen -lf ~/.ssh/id_ed25519_mehlo.pub
```

Update SSH config (`~/.ssh/config`):
```
Host github.com
  HostName github.com
  Port 22
  User git
  IdentityFile ~/.ssh/id_ed25519_mehlo
  IdentitiesOnly yes
  AddKeysToAgent yes
```

#### Step 3: Remove Problematic Git URL Rewrites

Check for and remove problematic URL rewrite rules:
```bash
# Check for problematic URL rewrites
git config --list | findstr url

# Remove the problematic rewrite rule
git config --global --unset url.https://github.com:443/.insteadof
```

#### Step 4: Set Up Organization Repository Remote

```bash
# Remove existing origin if needed
git remote remove origin

# Add SSH remote for organization repository
git remote add origin git@github.com:absa-group/Alternative_Physical_Channels_QA.git

# Test SSH connection
ssh -T git@github.com
# Should show: Hi MehloNkolele! You've successfully authenticated...

# Push to organization repository
git push origin feature/your-branch-name
```

#### Step 5: Configure Git User for Organization Work

```bash
# Set organization email for this repository
git config user.email "mehlo.nkolele@absa.africa"
git config user.name "Mehlo Nkolele"

# Or set globally if you primarily work with organization repos
git config --global user.email "mehlo.nkolele@absa.africa"
git config --global user.name "Mehlo Nkolele"
```

## Verification Commands

### Check SSH Connection
```bash
ssh -T git@github.com
```

### Check Git Configuration
```bash
git config user.email
git config user.name
```

### Check Remotes
```bash
git remote -v
```

### Test Push
```bash
git push [remote-name] [branch-name]
```

## Common Issues and Troubleshooting

### Issue 1: "Connection reset" error
- **Cause**: Port 443 blocked or SSH config using wrong hostname
- **Solution**: Use port 22 and `github.com` as hostname

### Issue 2: "GH007: Your push would publish a private email address"
- **Cause**: Git configured with personal email
- **Solution**: Use GitHub noreply email format

### Issue 3: SSH key not found
- **Cause**: SSH key not properly configured or missing
- **Solution**: 
  ```bash
  # Check if key exists
  ls ~/.ssh/
  
  # Generate new key if needed
  ssh-keygen -t ed25519 -C "your-email@example.com"
  
  # Add to SSH agent
  ssh-add ~/.ssh/id_ed25519
  ```

### Issue 4: Permission denied
- **Cause**: SSH key not added to GitHub account
- **Solution**:
  1. Copy public key: `cat ~/.ssh/id_ed25519.pub`
  2. Add to GitHub: Settings → SSH and GPG keys → New SSH key

### Issue 5: Having to type remote and branch every time
- **Cause**: No upstream tracking configured
- **Solution**:
  ```bash
  git branch --set-upstream-to=[remote-name]/main main
  # Then just use: git push
  ```

### Issue 6: "Repository not found" for organization repositories
- **Cause**: Using wrong SSH key or not authenticated with organization account
- **Solution**:
  ```bash
  # Authenticate with GitHub CLI for organization account
  gh auth refresh

  # Update SSH config to use organization key
  # Edit ~/.ssh/config to use correct IdentityFile

  # Remove and re-add remote with SSH
  git remote remove origin
  git remote add origin git@github.com:organization/repository.git
  ```

### Issue 7: Git automatically adding ":443" to HTTPS URLs
- **Cause**: Problematic URL rewrite rule in Git config
- **Solution**:
  ```bash
  # Check for problematic URL rewrites
  git config --list | grep url

  # Remove the problematic rewrite rule
  git config --global --unset url.https://github.com:443/.insteadof
  ```

### Issue 8: Multiple GitHub accounts (personal vs organization)
- **Cause**: Need to switch between different GitHub accounts
- **Solution**:
  ```bash
  # Use GitHub CLI to manage multiple accounts
  gh auth refresh  # Will prompt to select account
  gh auth status   # Check which account is active

  # Configure different SSH keys for different accounts
  # Use specific SSH config entries for each account
  ```

## Best Practices

1. **Always use SSH for private repositories** - More secure than HTTPS with tokens
2. **Use GitHub noreply email** - Protects your privacy
3. **Set up upstream tracking** - Simplifies push/pull commands
4. **Use global Git configuration** - Consistent settings across all repositories
5. **Test SSH connection** before pushing
6. **Keep SSH config simple** - Use standard ports and hostnames
7. **Backup SSH keys** - Store them securely
8. **Use the automated setup script** - Ensures consistent configuration

## Automated Setup Script

For quick setup, use the provided PowerShell script:

```powershell
# Run the automated setup script
powershell -ExecutionPolicy Bypass -File setup-github-ssh.ps1
```

This script will:
- Create/update SSH configuration
- Set global Git configuration
- Test SSH connection
- Display current settings

## Upstream Tracking Setup

To avoid typing the remote and branch every time:

```bash
# Set upstream tracking (one-time setup)
git branch --set-upstream-to=benighter/main main

# Now you can just use:
git push                    # Instead of: git push benighter main
git pull                    # Instead of: git pull benighter main
```

## Quick Reference Commands (Multi-Account Setup)

### Personal Repository Setup (Benighter)
```bash
# Test SSH for personal account
ssh -T git@github.com
# Expected: Hi Benighter! You've successfully authenticated...

# Set correct email for personal repos
git config user.email "111303968+Benighter@users.noreply.github.com"
git config user.name "Benighter"

# Add SSH remote for personal repository
git remote add origin git@github.com:Benighter/[repo-name].git

# Set upstream tracking
git branch --set-upstream-to=origin/main main

# Push with SSH (after upstream setup)
git push                    # Simple push to tracked remote
```

### Organization Repository Setup (MehloNkolele)
```bash
# Test SSH for organization account
ssh -T git@github.com-work
# Expected: Hi MehloNkolele! You've successfully authenticated...

# Configure organization email for this repository
git config user.email "mehlo.nkolele@absa.africa"
git config user.name "Mehlo Nkolele"

# Add SSH remote for organization repository
git remote add origin git@github.com-work:absa-group/[repo-name].git

# Set upstream tracking
git branch --set-upstream-to=origin/main main

# Push to organization repository
git push                    # Simple push to tracked remote
```

### Multi-Account SSH Configuration Setup
```bash
# Create the multi-account SSH config
powershell -Command "@'
# Personal GitHub account (Benighter)
Host github.com-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
  AddKeysToAgent yes

# Organization GitHub account (MehloNkolele)
Host github.com-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_mehlo
  IdentitiesOnly yes
  AddKeysToAgent yes

# Default GitHub configuration (for personal account - Benighter)
Host github.com
  HostName github.com
  Port 22
  User git
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
  AddKeysToAgent yes
  ServerAliveInterval 60
  ServerAliveCountMax 10
'@ | Out-File -FilePath ~/.ssh/config -Encoding ASCII"

# Test both accounts
ssh -T git@github.com        # Should show: Hi Benighter!
ssh -T git@github.com-work   # Should show: Hi MehloNkolele!
```

## File Locations

- **SSH Config**: `~/.ssh/config` (Windows: `C:\Users\[username]\.ssh\config`)
- **SSH Keys**: `~/.ssh/id_ed25519` and `~/.ssh/id_ed25519.pub`
- **Git Config**: `.git/config` (local) or `~/.gitconfig` (global)
- **Setup Script**: `setup-github-ssh.ps1` (in project root)

## Complete Workflow Examples (Multi-Account Setup)

### Personal Repository Workflow (Benighter)
```bash
# One-time setup for personal repository
git config user.email "111303968+Benighter@users.noreply.github.com"
git config user.name "Benighter"
git remote add origin git@github.com:Benighter/your-repo.git
git branch --set-upstream-to=origin/main main

# Test SSH connection
ssh -T git@github.com              # Should show: Hi Benighter!

# Daily workflow
git add .
git commit -m "Your changes"
git push                           # Simple push!
```

### Organization Repository Workflow (MehloNkolele)
```bash
# One-time setup for organization repository
git config user.email "mehlo.nkolele@absa.africa"
git config user.name "Mehlo Nkolele"
git remote add origin git@github.com-work:absa-group/repo-name.git
git branch --set-upstream-to=origin/main main

# Test SSH connection
ssh -T git@github.com-work         # Should show: Hi MehloNkolele!

# Daily workflow
git add .
git commit -m "Your changes"
git push                           # Simple push!
```

### Initial Multi-Account SSH Setup (One-Time)
```bash
# Step 1: Create multi-account SSH configuration
powershell -Command "@'
# Personal GitHub account (Benighter)
Host github.com-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
  AddKeysToAgent yes

# Organization GitHub account (MehloNkolele)
Host github.com-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_mehlo
  IdentitiesOnly yes
  AddKeysToAgent yes

# Default GitHub configuration (for personal account - Benighter)
Host github.com
  HostName github.com
  Port 22
  User git
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
  AddKeysToAgent yes
  ServerAliveInterval 60
  ServerAliveCountMax 10
'@ | Out-File -FilePath ~/.ssh/config -Encoding ASCII"

# Step 2: Test both SSH connections
ssh -T git@github.com              # Should show: Hi Benighter!
ssh -T git@github.com-work         # Should show: Hi MehloNkolele!

# Step 3: You're ready to work with both accounts!
```

---

**Note**: Replace placeholders like `[username]`, `[repository]`, `[user-id]` with your actual values.
