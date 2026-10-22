<#
.SYNOPSIS
  One-off IIS settings LoyalTEA needs. Run once, elevated, after installing the
  IIS "URL Rewrite" and "Application Request Routing (ARR)" modules.

  - Turns on ARR's proxy so IIS can forward requests to the LoyalTEA service
  - Keeps the visitor's address in X-Forwarded-For (used by the office Wi-Fi lock)
  - Stops ARR rewriting redirect addresses
  - Lets the site pass the app's own error messages through (httpErrors)
#>
$ErrorActionPreference = "Stop"
Import-Module WebAdministration

$apphost = "MACHINE/WEBROOT/APPHOST"
Set-WebConfigurationProperty -PSPath $apphost -Filter "system.webServer/proxy" -Name "enabled" -Value "True"
Set-WebConfigurationProperty -PSPath $apphost -Filter "system.webServer/proxy" -Name "xForwardedForHeaderName" -Value "X-Forwarded-For"
Set-WebConfigurationProperty -PSPath $apphost -Filter "system.webServer/proxy" -Name "includePortInXForwardedFor" -Value "False"
Set-WebConfigurationProperty -PSPath $apphost -Filter "system.webServer/proxy" -Name "reverseRewriteHostInResponseHeaders" -Value "False"

& "$env:windir\system32\inetsrv\appcmd.exe" unlock config -section:system.webServer/httpErrors | Out-Null

Write-Host "IIS is ready for LoyalTEA." -ForegroundColor Green
