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

### Instalar e preparar

Na raiz do projeto:

```powershell
npm.cmd --prefix backend install
npm.cmd run celular
```

O comando `celular` inicia tudo junto: PostgreSQL, backend, frontend, criação das tabelas e conexão segura com o Android. Não é necessário abrir vários terminais.

Nas próximas vezes, execute somente:

```powershell
npm.cmd run celular
```

Também é possível clicar duas vezes no arquivo `iniciar-celular.cmd` na pasta do projeto.

Abra:

```text
http://127.0.0.1:5241/
```

API de saúde:

```text
http://127.0.0.1:5241/api/health
```

Para iniciar somente o banco:

```powershell
npm.cmd run db:start
```

Para usar outro PostgreSQL, defina a conexão antes dos comandos:

```powershell
$env:DATABASE_URL="postgres://USUARIO:SENHA@SERVIDOR:5432/pet_identification"
```

## Instalar no Android

Na primeira vez:

1. No Android, ative **Opções do desenvolvedor**.
2. Ative **Depuração USB**.
3. Conecte o celular ao computador pelo cabo USB.
4. Desbloqueie o celular e aceite **Permitir depuração USB**.
5. Execute:

```powershell
npm.cmd run celular
```

O ADB oficial será baixado automaticamente para `C:\tmp\pet-android-tools`. Quando o terminal confirmar que o Android está conectado, o Chrome do celular abrirá automaticamente:

```text
http://127.0.0.1:5241/
```

No menu do Chrome, toque em **Instalar app** ou **Adicionar à tela inicial**. Depois da primeira instalação, o aplicativo consegue abrir offline; mantenha o cabo e o servidor ativos quando quiser sincronizar com o banco.

Também é possível clicar duas vezes em `iniciar-celular.cmd` para fazer todo esse processo.

### Testar somente pelo Wi-Fi

Para abrir como site em outro aparelho da mesma rede, execute:

```powershell
npm.cmd start
```

O terminal mostrará o endereço de rede. Esse modo serve para testar o site, mas não permite a instalação PWA completa porque usa HTTP fora do `localhost`.

No próprio computador, o endereço continua sendo:

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
