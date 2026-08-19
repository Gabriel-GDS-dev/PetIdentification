param(
  [int]$SmokeTestSeconds = 0
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

. "$PSScriptRoot\server-port-utils.ps1"

$projectDirectory = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$backendDirectory = Resolve-Path (Join-Path $PSScriptRoot "..")
$runtimeDirectory = Join-Path $projectDirectory ".runtime"
$toolsDirectory = Join-Path $runtimeDirectory "tools"
$logsDirectory = Join-Path $runtimeDirectory "logs"
$latestUrlFile = Join-Path $runtimeDirectory "latest-public-url.txt"
$port = Get-PetServerPort

New-Item -ItemType Directory -Path $runtimeDirectory, $toolsDirectory, $logsDirectory -Force | Out-Null

function Resolve-Cloudflared {
  $installed = Get-Command cloudflared.exe -ErrorAction SilentlyContinue
  if (-not $installed) { $installed = Get-Command cloudflared -ErrorAction SilentlyContinue }
  if ($installed) { return $installed.Source }

  $cloudflared = Join-Path $toolsDirectory "cloudflared.exe"
  if (Test-Path -LiteralPath $cloudflared) { return $cloudflared }

  $arch = if ([Environment]::Is64BitOperatingSystem) { "amd64" } else { "386" }
  $downloadUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-$arch.exe"

  Write-Host "Baixando cloudflared oficial para .runtime/tools..."
  Invoke-WebRequest -Uri $downloadUrl -OutFile $cloudflared

  if (-not (Test-Path -LiteralPath $cloudflared)) {
    throw "Nao foi possivel baixar o cloudflared."
  }

  return $cloudflared
}

function Wait-ForLocalServer {
  param(
    [System.Diagnostics.Process]$Process,
    [string]$Stdout,
    [string]$Stderr
  )

  for ($attempt = 0; $attempt -lt 45; $attempt++) {
    if ($Process.HasExited) {
      Write-Host "O backend encerrou antes de ficar pronto." -ForegroundColor Yellow
      if (Test-Path -LiteralPath $Stdout) { Get-Content -LiteralPath $Stdout }
      if (Test-Path -LiteralPath $Stderr) { Get-Content -LiteralPath $Stderr }
      throw "Nao foi possivel iniciar o backend local."
    }

    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/api/health" -TimeoutSec 3
      if ($response.StatusCode -eq 200) { return }
    } catch {
    }

    Start-Sleep -Seconds 1
  }

  throw "O backend local nao respondeu em http://127.0.0.1:$port/api/health."
}

function Read-TextFileIfExists {
  param([string]$Path)

  if (Test-Path -LiteralPath $Path) {
    return (Get-Content -LiteralPath $Path -Raw -ErrorAction SilentlyContinue)
  }

  return ""
}

function Find-TryCloudflareUrl {
  param(
    [string]$Stdout,
    [string]$Stderr
  )

  $content = (Read-TextFileIfExists -Path $Stdout) + "`n" + (Read-TextFileIfExists -Path $Stderr)
  $match = [regex]::Match($content, "https://[a-zA-Z0-9.-]+\.trycloudflare\.com")
  if ($match.Success) { return $match.Value }
  return ""
}

function Enable-KeepAwake {
  if (-not ("PetKeepAwake" -as [type])) {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class PetKeepAwake
{
    [DllImport("kernel32.dll")]
    public static extern uint SetThreadExecutionState(uint flags);
}
"@
  }

  $ES_CONTINUOUS = [uint32]"0x80000000"
  $ES_SYSTEM_REQUIRED = [uint32]"0x00000001"
  [PetKeepAwake]::SetThreadExecutionState($ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED) | Out-Null
}

function Disable-KeepAwake {
  if ("PetKeepAwake" -as [type]) {
    $ES_CONTINUOUS = [uint32]"0x80000000"
    [PetKeepAwake]::SetThreadExecutionState($ES_CONTINUOUS) | Out-Null
  }
}

$backendProcess = $null
$tunnelProcess = $null

try {
  Enable-KeepAwake

  & (Join-Path $PSScriptRoot "start-local-db.ps1")

  $owners = @(Get-PortOwnerIds -Port $port)
  if ($owners.Count) {
    if (-not (Stop-PetServerOnPort -Port $port)) {
      throw "Libere a porta $port ou altere a variavel PORT antes de iniciar."
    }
  }

  Set-PetSessionSecret -ProjectDirectory $projectDirectory
  $cloudflared = Resolve-Cloudflared

  $backendOut = Join-Path $logsDirectory "backend.out.log"
  $backendErr = Join-Path $logsDirectory "backend.err.log"
  $tunnelOut = Join-Path $logsDirectory "cloudflared.out.log"
  $tunnelErr = Join-Path $logsDirectory "cloudflared.err.log"
  Remove-Item -LiteralPath $backendOut, $backendErr, $tunnelOut, $tunnelErr, $latestUrlFile -ErrorAction SilentlyContinue

  Write-Host "Iniciando backend local em http://127.0.0.1:$port..."
  $backendProcess = Start-Process -FilePath "node" -ArgumentList @("server.js") -WorkingDirectory $backendDirectory -WindowStyle Hidden -RedirectStandardOutput $backendOut -RedirectStandardError $backendErr -PassThru
  Wait-ForLocalServer -Process $backendProcess -Stdout $backendOut -Stderr $backendErr

  Write-Host "Abrindo tunel HTTPS publico com Cloudflare..."
  $origin = "http://127.0.0.1:$port"
  $tunnelProcess = Start-Process -FilePath $cloudflared -ArgumentList @("tunnel", "--url", $origin) -WorkingDirectory $projectDirectory -WindowStyle Hidden -RedirectStandardOutput $tunnelOut -RedirectStandardError $tunnelErr -PassThru

  $publicUrl = ""
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    if ($tunnelProcess.HasExited) { break }

    $publicUrl = Find-TryCloudflareUrl -Stdout $tunnelOut -Stderr $tunnelErr
    if ($publicUrl) { break }
    Start-Sleep -Seconds 1
  }

  if (-not $publicUrl) {
    Write-Host "Nao consegui encontrar o link publico do Cloudflare." -ForegroundColor Yellow
    if (Test-Path -LiteralPath $tunnelOut) { Get-Content -LiteralPath $tunnelOut }
    if (Test-Path -LiteralPath $tunnelErr) { Get-Content -LiteralPath $tunnelErr }
    throw "O tunel publico nao ficou pronto."
  }

  $publicUrl | Set-Content -LiteralPath $latestUrlFile -NoNewline -Encoding ASCII
  Write-Host ""
  Write-Host "APP PUBLICO PRONTO:"
  Write-Host $publicUrl -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Use esse link no celular, na faculdade ou em qualquer rede."
  Write-Host "Deixe esta janela aberta. Pressione Ctrl+C para encerrar app e tunel."
  Write-Host "O ultimo link tambem ficou salvo em .runtime/latest-public-url.txt"
  Write-Host ""

  if ($SmokeTestSeconds -gt 0) {
    Write-Host "Smoke test ativo: encerrando em $SmokeTestSeconds segundo(s)."
    Start-Sleep -Seconds $SmokeTestSeconds
    return
  }

  while (-not $tunnelProcess.HasExited) {
    Start-Sleep -Seconds 2
    if ($backendProcess.HasExited) {
      throw "O backend local encerrou. Veja os logs em .runtime/logs."
    }
  }

  exit $tunnelProcess.ExitCode
} finally {
  if ($tunnelProcess -and -not $tunnelProcess.HasExited) {
    Stop-Process -Id $tunnelProcess.Id -Force -ErrorAction SilentlyContinue
  }

  if ($backendProcess -and -not $backendProcess.HasExited) {
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
  }

  Disable-KeepAwake
}
