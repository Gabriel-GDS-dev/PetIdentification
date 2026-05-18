# Identificação Pet - Carteira Digital para Pets

PWA para carteira digital de pets com frontend separado, backend Node e PostgreSQL.

## Estrutura

```text
PetIdentification/
  frontend/
    index.html
    app.js
    styles.css
    service-worker.js
    manifest.webmanifest
    assets/
  backend/
    server.js
    database.js
    db/schema.sql
    scripts/setup-db.js
    package.json
  package.json
  README.md
```

## Rodar com banco

O app salva primeiro no celular para funcionar offline. Quando o servidor está acessível, ele sincroniza com a API `/api/sync` e grava no PostgreSQL.

### 1. Subir PostgreSQL local de teste

```powershell
$data='C:\tmp\pet-postgres-data'
if (!(Test-Path $data)) {
  & 'C:\Program Files\PostgreSQL\18\bin\initdb.exe' -D $data -U postgres -A trust --encoding=UTF8 --locale=C
}
& 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe' -D $data -o '"-p" "55432" "-h" "127.0.0.1"' -l 'C:\tmp\pet-postgres.log' start
```

Configure a conexão:

```powershell
$env:DATABASE_URL="postgres://postgres@127.0.0.1:55432/pet_identification"
```

### 2. Instalar e preparar

Na raiz do projeto:

```powershell
npm.cmd --prefix backend install
npm.cmd run db:setup
npm.cmd start
```

Abra:

```text
http://127.0.0.1:5241/
```

API de saúde:

```text
http://127.0.0.1:5241/api/health
```

## Rodar no celular

Com computador e celular na mesma rede Wi-Fi, descubra o IP:

```powershell
ipconfig
```

No celular:

```text
http://SEU-IP:5241/
```

Neste computador, o IP de rede local encontrado foi:

```text
http://192.168.0.9:5241/
```

Para instalação PWA completa, Android/iOS normalmente exigem HTTPS ou localhost. Para Android com cabo USB:

```powershell
adb reverse tcp:5241 tcp:5241
```

Depois abra no celular:

```text
http://127.0.0.1:5241/
```

## Funcionalidades principais

- Carteira animal com frente e verso inspirada nos exemplos enviados.
- Edição completa dos dados do pet.
- Upload de foto do pet.
- Assinatura digital no próprio app.
- Download da carteira em PDF.
- Cadastro e login via API com senha em hash.
- Sincronização offline/online com PostgreSQL.
- Manifest e service worker para PWA.
