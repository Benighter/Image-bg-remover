# PowerShell script to update VS Code settings for Git multi-account support

$settingsPath = "$env:APPDATA\Code\User\settings.json"

# Read current settings
$settingsContent = Get-Content $settingsPath -Raw
$settings = $settingsContent | ConvertFrom-Json

# Add Git-specific settings for multi-account support
$gitSettings = @{
    "git.useCommitInputAsStashMessage" = $true
    "git.confirmSync" = $false
    "git.alwaysSignOff" = $false
    "git.fetchOnPull" = $true
    "git.pullTags" = $false
    "git.showPushSuccessNotification" = $true
    "git.allowForcePush" = $false
    "git.useForcePushWithLease" = $true
    "git.enableSmartCommit" = $true
    "git.autofetch" = $true
    "git.openRepositoryInParentFolders" = "never"
    "git.defaultCloneDirectory" = "C:\Users\AB038N8\OneDrive - Absa\Desktop\Programming"
    "git.terminalAuthentication" = $true
    "git.useIntegratedAskPass" = $true
}

# Add each Git setting to the settings object
foreach ($key in $gitSettings.Keys) {
    $settings | Add-Member -NotePropertyName $key -NotePropertyValue $gitSettings[$key] -Force
}

# Convert back to JSON and save
$updatedSettings = $settings | ConvertTo-Json -Depth 10
$updatedSettings | Out-File -FilePath $settingsPath -Encoding UTF8

Write-Host "VS Code settings updated successfully!"
Write-Host "Added Git multi-account support settings."
