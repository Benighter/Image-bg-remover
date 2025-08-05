# Test script to verify Git multi-account configuration

Write-Host "🧪 Testing Git Multi-Account Configuration" -ForegroundColor Cyan
Write-Host "=" * 50

# Test 1: SSH Connection for Personal Account
Write-Host "`n1️⃣ Testing SSH connection for personal account (Benighter)..." -ForegroundColor Yellow
try {
    $sshResult = ssh -T git@github.com 2>&1
    if ($sshResult -match "Hi Benighter!") {
        Write-Host "✅ SSH for Benighter: SUCCESS" -ForegroundColor Green
        Write-Host "   $sshResult"
    } else {
        Write-Host "❌ SSH for Benighter: FAILED" -ForegroundColor Red
        Write-Host "   $sshResult"
    }
} catch {
    Write-Host "❌ SSH test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: SSH Connection for Work Account
Write-Host "`n2️⃣ Testing SSH connection for work account (MehloNkolele)..." -ForegroundColor Yellow
try {
    $sshWorkResult = ssh -T git@github.com-work 2>&1
    if ($sshWorkResult -match "Hi MehloNkolele!") {
        Write-Host "✅ SSH for MehloNkolele: SUCCESS" -ForegroundColor Green
        Write-Host "   $sshWorkResult"
    } else {
        Write-Host "❌ SSH for MehloNkolele: FAILED" -ForegroundColor Red
        Write-Host "   $sshWorkResult"
    }
} catch {
    Write-Host "❌ SSH work test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Current Git Configuration
Write-Host "`n3️⃣ Current Git configuration..." -ForegroundColor Yellow
$currentUser = git config user.name
$currentEmail = git config user.email
Write-Host "   User: $currentUser"
Write-Host "   Email: $currentEmail"

if ($currentUser -eq "Benighter" -and $currentEmail -eq "111303968+Benighter@users.noreply.github.com") {
    Write-Host "✅ Personal Git config: CORRECT" -ForegroundColor Green
} else {
    Write-Host "⚠️ Git config may need adjustment" -ForegroundColor Yellow
}

# Test 4: Check Work Directory Configuration
Write-Host "`n4️⃣ Testing work directory configuration..." -ForegroundColor Yellow
$workDir = "C:\Users\AB038N8\OneDrive - Absa\Desktop\Programming\Work"
if (Test-Path $workDir) {
    Write-Host "✅ Work directory exists: $workDir" -ForegroundColor Green
    
    # Test Git config in work directory
    Push-Location $workDir
    $workUser = git config user.name 2>$null
    $workEmail = git config user.email 2>$null
    Pop-Location
    
    if ($workUser -eq "Mehlo Nkolele" -and $workEmail -eq "mehlo.nkolele@absa.africa") {
        Write-Host "✅ Work directory Git config: CORRECT" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Work directory Git config not detected (will be set when you clone work repos there)" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Work directory not found" -ForegroundColor Red
}

# Test 5: URL Rewriting
Write-Host "`n5️⃣ Testing URL rewriting configuration..." -ForegroundColor Yellow
$urlRewrite = git config --global --get url."https://github.com/absa-group/".insteadOf
if ($urlRewrite) {
    Write-Host "✅ URL rewriting configured: $urlRewrite" -ForegroundColor Green
} else {
    Write-Host "❌ URL rewriting not found" -ForegroundColor Red
}

# Summary
Write-Host "`n📋 CONFIGURATION SUMMARY" -ForegroundColor Cyan
Write-Host "=" * 30
Write-Host "🔹 Personal repos (Benighter): Use SSH by default"
Write-Host "   Example: git clone git@github.com:Benighter/repo.git"
Write-Host ""
Write-Host "🔹 Work repos (MehloNkolele): Use HTTPS automatically"
Write-Host "   Example: git clone https://github.com/absa-group/repo.git"
Write-Host "   (Clone in: $workDir)"
Write-Host ""
Write-Host "🔹 VS Code: Updated with Git multi-account settings"
Write-Host "🔹 Terminal: Works with both SSH and HTTPS"
Write-Host "🔹 All Git clients: Will use the same configuration"

Write-Host "`n🎯 NEXT STEPS:" -ForegroundColor Green
Write-Host "1. For personal repos: Continue using SSH as normal"
Write-Host "2. For work repos: Clone into the Work folder using HTTPS URLs"
Write-Host "3. VS Code will automatically use the correct configuration"
Write-Host "4. No manual switching needed!"
