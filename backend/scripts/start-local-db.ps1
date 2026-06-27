$ErrorActionPreference = "Stop"

$port = if ($env:PET_DB_PORT) { [int]$env:PET_DB_PORT } else { 55432 }
$dataDirectory = if ($env:PET_DB_DATA) { $env:PET_DB_DATA } else { "C:\tmp\pet-postgres-data" }
$logFile = if ($env:PET_DB_LOG) { $env:PET_DB_LOG } else { "C:\tmp\pet-postgres.log" }

if ($env:POSTGRES_BIN) {
  $postgresBin = $env:POSTGRES_BIN
} else {
  $installRoot = Join-Path $env:ProgramFiles "PostgreSQL"
  $installations = @(
    Get-ChildItem -LiteralPath $installRoot -Directory -ErrorAction SilentlyContinue |
      Where-Object {
        Test-Path -LiteralPath (Join-Path $_.FullName "bin\initdb.exe")
      } |
      Sort-Object { if ($_.Name -as [version]) { [version]$_.Name } else { [version]"0.0" } } -Descending
  )

  if (-not $installations.Count) {
    throw "PostgreSQL nao encontrado. Instale o PostgreSQL ou defina POSTGRES_BIN com o caminho da pasta bin."
  }

  $postgresBin = Join-Path $installations[0].FullName "bin"
}

$initDb = Join-Path $postgresBin "initdb.exe"
$pgCtl = Join-Path $postgresBin "pg_ctl.exe"

if (-not (Test-Path -LiteralPath $initDb) -or -not (Test-Path -LiteralPath $pgCtl)) {
  throw "initdb.exe ou pg_ctl.exe nao foi encontrado em '$postgresBin'."
}

$dataParent = Split-Path -Parent $dataDirectory
$logParent = Split-Path -Parent $logFile
New-Item -ItemType Directory -Path $dataParent -Force | Out-Null
New-Item -ItemType Directory -Path $logParent -Force | Out-Null

if (-not (Test-Path -LiteralPath (Join-Path $dataDirectory "PG_VERSION"))) {
  Write-Host "Preparando PostgreSQL local em $dataDirectory..."
  & $initDb -D $dataDirectory -U postgres -A trust --encoding=UTF8 --locale=C
  if ($LASTEXITCODE -ne 0) { throw "O initdb falhou com o codigo $LASTEXITCODE." }
}

& $pgCtl -D $dataDirectory status *> $null
if ($LASTEXITCODE -eq 0) {
  Write-Host "PostgreSQL local ja esta em execucao na porta $port."
  exit 0
}

Write-Host "Iniciando PostgreSQL local na porta $port..."
& $pgCtl -D $dataDirectory -o "-p $port -h 127.0.0.1" -l $logFile start -w
if ($LASTEXITCODE -ne 0) {
  throw "Nao foi possivel iniciar o PostgreSQL. Consulte o log em $logFile."
}

Write-Host "PostgreSQL local pronto em 127.0.0.1:$port."
