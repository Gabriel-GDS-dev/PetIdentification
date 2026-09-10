# Registro Digital Animal - Carteira Digital para Pets

PWA para carteira digital de pets com frontend separado, backend Node e MongoDB.

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
    package.json
  package.json
  README.md
```

## Instalar e preparar

Na raiz do projeto:

```powershell
npm.cmd install
```

## Rodar no computador

Use:

```powershell
npm.cmd start
```

Esse comando libera a porta `5241` caso uma instância antiga deste app tenha ficado aberta e inicia backend + frontend.

No computador, abra:

```text
http://127.0.0.1:5241/
```

API de saúde:

```text
http://127.0.0.1:5241/api/health
```

Para encerrar uma instância antiga manualmente:

```powershell
npm.cmd run server:stop
```

## Rodar no celular sem cabo

Use:

```powershell
npm.cmd run celular
```

Depois abra no celular o endereço que aparecer no terminal, por exemplo:

```text
http://192.168.0.3:5241/
```

Requisitos:

- O computador precisa continuar ligado com o terminal aberto.
- O celular e o computador precisam estar na mesma rede Wi-Fi.
- Se o celular não abrir o endereço, libere o Node.js no Firewall do Windows para redes privadas.

O app salva primeiro no celular para funcionar offline. Quando o servidor está acessível, ele sincroniza com a API `/api/sync` e grava no MongoDB.

## Usar de qualquer lugar pela internet

Para deixar o PC de casa rodando e usar o app na faculdade, use:

```powershell
npm.cmd run internet
```

Na primeira vez, o comando baixa o `cloudflared` oficial dentro de `.runtime/tools`. Depois ele inicia o backend local e abre um túnel HTTPS público.

Quando ficar pronto, o terminal mostrará um link parecido com:

```text
https://exemplo-aleatorio.trycloudflare.com
```

Abra esse link no celular em qualquer rede. Enquanto quiser usar fora de casa, mantenha o PC ligado e essa janela aberta. O último link também fica salvo em:

```text
.runtime/latest-public-url.txt
```

Também é possível clicar duas vezes em `iniciar-internet.cmd`.

Importante:

- O link gratuito `trycloudflare.com` muda quando o túnel é reiniciado.
- Qualquer pessoa com o link consegue abrir a tela de login/cadastro do app.
- Para ter um endereço fixo, como `https://meuapp.com`, crie um túnel nomeado no Cloudflare com domínio próprio.

## Observações sobre Wi-Fi e PWA

O endereço `http://192.168.x.x:5241` só funciona dentro da mesma rede Wi-Fi. Para usar fora de casa, da faculdade ou de outra rede, é necessário publicar o app em HTTPS ou abrir um túnel seguro para o servidor local.

Também vale para instalação PWA completa e GPS no navegador: fora de `localhost`, os navegadores normalmente exigem HTTPS. Sem HTTPS, o site pode abrir pelo IP local e sincronizar, mas a instalação pode virar apenas um atalho.

## Modo Android com USB

O modo antigo com ADB continua disponível:

```powershell
npm.cmd run celular:usb
```

Na primeira vez:

1. No Android, ative **Opções do desenvolvedor**.
2. Ative **Depuração USB**.
3. Conecte o celular ao computador pelo cabo USB.
4. Desbloqueie o celular e aceite **Permitir depuração USB**.
5. Execute `npm.cmd run celular:usb`.

O ADB oficial será baixado automaticamente para `C:\tmp\pet-android-tools`. Quando o terminal confirmar que o Android está conectado, o Chrome do celular abrirá automaticamente:

```text
http://127.0.0.1:5241/
```

## Banco de dados

Para usar MongoDB local, inicie seu `mongod` manualmente ou use o MongoDB Atlas.

Para usar outro MongoDB local ou Atlas, defina a conexão antes dos comandos:

```powershell
$env:MONGODB_URI="mongodb+srv://USUARIO:SENHA@SEU-CLUSTER.mongodb.net/?retryWrites=true&w=majority"
$env:MONGODB_DB="pet_identification"
```

## Deploy pelo GitHub na Vercel

O repositório já está preparado para a Vercel:

- `frontend/` é publicado como site estático/PWA.
- `api/[...path].js` executa a API Node como Function serverless.
- A API usa MongoDB Atlas por meio de `MONGODB_URI`; não use um banco local no deploy.

### 1. Subir o projeto para o GitHub

Na raiz do projeto:

```powershell
git add .
git commit -m "Preparar deploy na Vercel"
git push origin main
```

Nunca adicione `.env`, senhas ou `MONGODB_URI` real ao repositório. Use `.env.example` apenas como referência.

### 2. Criar o projeto na Vercel

1. Acesse **Add New > Project** e importe o repositório do GitHub.
2. Mantenha a raiz do projeto como **Root Directory**.
3. Use o preset **Other** (o `vercel.json` já define as rotas).
4. Em **Environment Variables**, adicione `MONGODB_URI`, `MONGODB_DB` e `SESSION_SECRET` para **Production**, **Preview** e **Development**.
5. Faça o deploy.

`SESSION_SECRET` deve ser um segredo aleatório longo e igual entre os deploys. `MONGODB_URI` deve ser a connection string do MongoDB Atlas, sem aspas. Os índices são criados automaticamente quando a Function inicializa.

### MongoDB Atlas

No Atlas, use **Connect > Drivers > Node.js** e copie a URI `mongodb+srv://...`. Substitua `<password>` pela senha do usuário do banco, faça URL-encode de caracteres especiais da senha e informe o nome do banco em `MONGODB_DB`. Nunca coloque a URI real no GitHub ou no código.

Depois de salvar as variáveis, faça **Redeploy**. A aplicação cria os índices das coleções `users` e `wallet_states` na primeira inicialização da Function; não é necessário rodar `db:start` na Vercel.

### Erros de login e manifest após publicar

Se o navegador mostrar uma URL `vercel.com/sso-api` no carregamento de `manifest.webmanifest`, desative a proteção do deployment em **Settings > Deployment Protection** (ou publique um domínio de produção sem autenticação). Um app PWA público não pode exigir login da conta Vercel para acessar o manifest e as Functions.

Se `/api/login` ou `/api/register` retornar `500`, confira em **Settings > Environment Variables**:

- `MONGODB_URI` contém a URI do Atlas e a senha está correta.
- O IP da Vercel está permitido em **Atlas > Network Access**. Para um primeiro teste, use `0.0.0.0/0` com um usuário de banco restrito.
- `SESSION_SECRET` está preenchido nos mesmos ambientes do deployment.

Após alterar qualquer variável, faça **Redeploy**. Consulte **Deployments > Functions > Logs** para confirmar a causa. Não use a URI do MongoDB em código, GitHub, `.env` versionado ou mensagens públicas.

Se o app mostrar **Dados grandes demais para sincronizar**, o MongoDB pode estar conectado corretamente. Esse aviso acontece quando fotos, PDFs ou scans deixam o JSON acima do limite de payload da Function na Vercel. Remova anexos grandes, reenvie imagens menores ou mova anexos para um storage separado antes de sincronizar.

### 3. Validar após o deploy

Abra estas URLs usando o domínio da Vercel:

```text
https://SEU-DOMINIO.vercel.app/
https://SEU-DOMINIO.vercel.app/api/health
```

O segundo endereço deve responder JSON com `"ok": true`. Se a API retornar erro de banco, confira a URI, permissões e Network Access do MongoDB Atlas.

## Funcionalidades principais

- Carteira animal com frente e verso inspirada nos exemplos enviados.
- Edição completa dos dados do pet.
- Preenchimento automático de rua, bairro, cidade e estado pelo CEP com ViaCEP.
- Campo manual somente para número e complemento do endereço.
- Veterinárias reais próximas usando GPS do tutor e dados do OpenStreetMap.
- Upload de foto do pet.
- Assinatura digital no próprio app.
- Upload de documentos do pet com foto/scan ou PDF.
- Download da carteira em PDF com frente, verso e slides dos documentos.
- Cadastro e login via API com senha em hash.
- Sincronização offline/online com MongoDB.
- Manifest e service worker para PWA.

As consultas de veterinárias usam a localização somente quando o tutor autoriza. O CEP é usado como alternativa. As integrações públicas respeitam a atribuição e os limites de uso do ViaCEP e do OpenStreetMap.
