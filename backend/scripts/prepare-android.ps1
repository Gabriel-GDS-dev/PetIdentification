$ErrorActionPreference = "Stop"

$toolsRoot = if ($env:PET_ANDROID_TOOLS) { $env:PET_ANDROID_TOOLS } else { "C:\tmp\pet-android-tools" }
$platformTools = Join-Path $toolsRoot "platform-tools"
$adb = Join-Path $platformTools "adb.exe"
$downloadUrl = "https://dl.google.com/android/repository/platform-tools-latest-windows.zip"
$archive = Join-Path $toolsRoot "platform-tools-latest-windows.zip"

if (-not (Test-Path -LiteralPath $adb)) {
  Write-Host "Baixando Android Platform Tools oficial..."
  New-Item -ItemType Directory -Path $toolsRoot -Force | Out-Null
  Invoke-WebRequest -Uri $downloadUrl -OutFile $archive
  Expand-Archive -LiteralPath $archive -DestinationPath $toolsRoot -Force
}

if (-not (Test-Path -LiteralPath $adb)) {
  throw "Nao foi possivel localizar o ADB em '$adb'."
}

& $adb start-server | Out-Null
$deviceLines = @(& $adb devices)
$authorized = @($deviceLines | Where-Object { $_ -match "\tdevice$" })
$unauthorized = @($deviceLines | Where-Object { $_ -match "\tunauthorized$" })

if ($unauthorized.Count) {
  Write-Host ""
  Write-Host "O Android ainda nao autorizou este computador." -ForegroundColor Yellow
  Write-Host "Desbloqueie o celular, aceite 'Permitir depuracao USB' e execute novamente." -ForegroundColor Yellow
  exit 1
}

if (-not $authorized.Count) {
  Write-Host ""
  Write-Host "Nenhum Android conectado foi encontrado." -ForegroundColor Yellow
  Write-Host "1. No celular, ative Opcoes do desenvolvedor." -ForegroundColor Yellow
  Write-Host "2. Ative Depuracao USB." -ForegroundColor Yellow
  Write-Host "3. Conecte o cabo USB e autorize este computador." -ForegroundColor Yellow
  Write-Host "4. Execute novamente: npm.cmd run celular" -ForegroundColor Yellow
  exit 1
}

$serial = ($authorized[0] -split "\s+")[0]
& $adb -s $serial reverse tcp:5241 tcp:5241 | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Nao foi possivel redirecionar a porta 5241 para o Android."
}

$openScript = Join-Path $PSScriptRoot "open-android.ps1"
Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", $openScript,
  "-Adb", $adb,
  "-Serial", $serial,
  "-Port", "5241"
) -WindowStyle Hidden | Out-Null

Write-Host "Android conectado e autorizado: $serial"
Write-Host "O app sera aberto automaticamente no Chrome assim que o servidor iniciar."
Write-Host "Endereco seguro no celular: http://127.0.0.1:5241"
Write-Host "Depois use o menu do Chrome e toque em 'Instalar app'."
