$ErrorActionPreference = "Stop"

$port = if ($env:PET_DB_PORT) { [int]$env:PET_DB_PORT } else { 55432 }
$databaseName = if ($env:PET_DB_NAME) { $env:PET_DB_NAME } else { "pet_identification" }
$dataDirectory = if ($env:PET_DB_DATA) { $env:PET_DB_DATA } else { "C:\tmp\pet-postgres-data" }
$logFile = if ($env:PET_DB_LOG) { $env:PET_DB_LOG } else { "C:\tmp\pet-postgres.log" }

if ($databaseName -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
  throw "PET_DB_NAME deve conter apenas letras, numeros e underscore, e nao pode comecar com numero."
}

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
$pgIsReady = Join-Path $postgresBin "pg_isready.exe"
$psql = Join-Path $postgresBin "psql.exe"

if (-not (Test-Path -LiteralPath $initDb) -or -not (Test-Path -LiteralPath $pgCtl) -or -not (Test-Path -LiteralPath $psql)) {
  throw "initdb.exe, pg_ctl.exe ou psql.exe nao foi encontrado em '$postgresBin'."
}

function Test-PostgresReady {
  if (-not (Test-Path -LiteralPath $pgIsReady)) { return $false }
  & $pgIsReady -h 127.0.0.1 -p $port -U postgres *> $null
  return ($LASTEXITCODE -eq 0)
}

function Ensure-PetDatabase {
  $exists = (& $psql -h 127.0.0.1 -p $port -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$databaseName'").Trim()
  if ($LASTEXITCODE -ne 0) { throw "Nao foi possivel consultar o PostgreSQL local." }

  if ($exists -ne "1") {
    Write-Host "Criando banco local $databaseName..."
    & $psql -h 127.0.0.1 -p $port -U postgres -d postgres -c "CREATE DATABASE `"$databaseName`" ENCODING 'UTF8';" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Nao foi possivel criar o banco local $databaseName." }
  }
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

if (Test-PostgresReady) {
  Write-Host "PostgreSQL local ja esta em execucao na porta $port."
  Ensure-PetDatabase
  Write-Host "DATABASE_URL=postgresql://postgres@127.0.0.1:$port/$databaseName"
  exit 0
}

& $pgCtl -D $dataDirectory status *> $null
if ($LASTEXITCODE -eq 0) {
  Write-Host "PostgreSQL local ja esta em execucao na porta $port."
  Ensure-PetDatabase
  Write-Host "DATABASE_URL=postgresql://postgres@127.0.0.1:$port/$databaseName"
  exit 0
}

$portListeners = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
if ($portListeners.Count) {
  for ($attempt = 0; $attempt -lt 15; $attempt++) {
    Start-Sleep -Seconds 1
    if (Test-PostgresReady) {
      Write-Host "PostgreSQL local ja esta em execucao na porta $port."
      Ensure-PetDatabase
      Write-Host "DATABASE_URL=postgresql://postgres@127.0.0.1:$port/$databaseName"
      exit 0
    }
  }

  throw "A porta $port ja esta ocupada, mas o PostgreSQL nao respondeu em 127.0.0.1:$port."
}

Write-Host "Iniciando PostgreSQL local na porta $port..."
& $pgCtl -D $dataDirectory -o "-p $port -h 127.0.0.1" -l $logFile start -w
if ($LASTEXITCODE -ne 0) {
  throw "Nao foi possivel iniciar o PostgreSQL. Consulte o log em $logFile."
}

Write-Host "PostgreSQL local pronto em 127.0.0.1:$port."
Ensure-PetDatabase
Write-Host "DATABASE_URL=postgresql://postgres@127.0.0.1:$port/$databaseName"
