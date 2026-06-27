param(
  [Parameter(Mandatory = $true)]
  [string]$Adb,

  [Parameter(Mandatory = $true)]
  [string]$Serial,

  [int]$Port = 5241
)

$ErrorActionPreference = "SilentlyContinue"
Start-Sleep -Seconds 5
$url = "http://127.0.0.1:$Port/"
$chromePackage = & $Adb -s $Serial shell pm path com.android.chrome

if ($chromePackage -match "^package:") {
  & $Adb -s $Serial shell am start -n com.android.chrome/com.google.android.apps.chrome.Main -a android.intent.action.VIEW -d $url | Out-Null
} else {
  & $Adb -s $Serial shell am start -a android.intent.action.VIEW -d $url | Out-Null
}
