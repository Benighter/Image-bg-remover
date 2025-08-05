# PowerShell script to set up hybrid Git configuration
# Personal (Benighter): SSH by default
# Work (MehloNkolele): HTTPS for better network compatibility

Write-Host "Setting up hybrid Git configuration..."
Write-Host "Personal repos (Benighter): SSH"
Write-Host "Work repos (MehloNkolele): HTTPS"
Write-Host ""

# Set up Git credential manager for HTTPS authentication
Write-Host "Configuring Git credential manager..."
git config --global credential.helper manager
git config --global credential.useHttpPath true

# Set up URL rewriting for organization repositories to use HTTPS
Write-Host "Setting up URL rewriting for Absa organization repos..."
git config --global url."https://github.com/absa-group/".insteadOf "git@github.com-work:absa-group/"

# Set up conditional Git configuration based on directory
Write-Host "Setting up conditional Git configuration..."

# Create work directory if it doesn't exist
$workDir = "C:\Users\AB038N8\OneDrive - Absa\Desktop\Programming\Work"
if (!(Test-Path $workDir)) {
    New-Item -ItemType Directory -Path $workDir -Force
    Write-Host "Created work directory: $workDir"
}

# Create .gitconfig-work file for work repositories
$workGitConfig = @"
[user]
    name = Mehlo Nkolele
    email = mehlo.nkolele@absa.africa

[url "https://github.com/absa-group/"]
    insteadOf = git@github.com:absa-group/
    insteadOf = git@github.com-work:absa-group/

[credential]
    helper = manager
    useHttpPath = true
"@

$workGitConfigPath = "$env:USERPROFILE\.gitconfig-work"
$workGitConfig | Out-File -FilePath $workGitConfigPath -Encoding UTF8
Write-Host "Created work Git config: $workGitConfigPath"

# Create .gitconfig-personal file for personal repositories
$personalGitConfig = @"
[user]
    name = Benighter
    email = 111303968+Benighter@users.noreply.github.com

[url "git@github.com:"]
    insteadOf = https://github.com/Benighter/
"@

$personalGitConfigPath = "$env:USERPROFILE\.gitconfig-personal"
$personalGitConfig | Out-File -FilePath $personalGitConfigPath -Encoding UTF8
Write-Host "Created personal Git config: $personalGitConfigPath"

# Update global .gitconfig with conditional includes
Write-Host "Updating global Git configuration..."

# Add conditional includes to global config
git config --global includeIf."gitdir:C:/Users/AB038N8/OneDrive - Absa/Desktop/Programming/Work/".path "~/.gitconfig-work"
git config --global includeIf."gitdir:~/OneDrive - Absa/Desktop/Programming/Work/".path "~/.gitconfig-work"

# Set default personal configuration
git config --global user.name "Benighter"
git config --global user.email "111303968+Benighter@users.noreply.github.com"

# Set other global Git settings
git config --global init.defaultBranch main
git config --global pull.rebase false
git config --global push.default simple
git config --global core.autocrlf true
git config --global core.editor "code --wait"

Write-Host ""
Write-Host "✅ Hybrid Git configuration completed!"
Write-Host ""
Write-Host "📁 Directory Structure:"
Write-Host "   Personal repos: Any location (uses SSH by default)"
Write-Host "   Work repos: $workDir (uses HTTPS automatically)"
Write-Host ""
Write-Host "🔧 Configuration:"
Write-Host "   Personal (Benighter): SSH + GitHub noreply email"
Write-Host "   Work (MehloNkolele): HTTPS + Absa email"
Write-Host ""
Write-Host "🚀 Usage:"
Write-Host "   Personal: git clone git@github.com:Benighter/repo.git"
Write-Host "   Work: git clone https://github.com/absa-group/repo.git (in Work folder)"
Write-Host ""
