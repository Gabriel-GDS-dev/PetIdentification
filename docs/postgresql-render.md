# PostgreSQL 18 no Render

Atualizado em 2026-09-16.

## Compatibilidade

O Render suporta PostgreSQL 18 para novas instancias. A documentacao oficial tambem diz que, em Blueprints, quando `postgresMajorVersion` e omitido, o Render usa a versao mais recente suportada, atualmente 18.

Links:

- https://render.com/docs/postgresql-creating-connecting
- https://render.com/docs/blueprint-spec
- https://render.com/docs/postgresql-upgrading
- https://render.com/docs/postgresql-credentials

## Como o projeto ficou organizado

- Conexao: `DATABASE_URL`.
- Driver Node: `pg`.
- Schema: `backend/db/schema.sql`.
- Estado completo do app: `pet_wallet_states.state` em `JSONB`.
- Dados relacionais principais: `pet_owners`, `pet_pets`, `pet_vaccines`, `pet_documents`, `pet_travel_plans`, `pet_travel_items`, `pet_feedback`, `pet_feedback_answers`.
- Anexos grandes: `pet_wallet_attachments`.
- Lotes temporarios de sincronizacao: `pet_sync_chunks`.
- Analytics: `pet_analytics_events`.

O servidor aplica o schema automaticamente ao iniciar. Quando o app salva o estado completo, ele tambem espelha os dados principais nas tabelas relacionais.

## Rodar localmente

1. Instale PostgreSQL 18 no Windows, se ainda nao tiver.
2. Na raiz do projeto, instale as dependencias:

```powershell
npm install
```

3. Inicie o PostgreSQL local do projeto:

```powershell
npm run db:start
```

Esse comando usa a porta `55432`, cria o banco `pet_identification` se ele nao existir e imprime:

```text
DATABASE_URL=postgresql://postgres@127.0.0.1:55432/pet_identification
```

4. Inicie o app:

```powershell
npm run celular
```

Se `DATABASE_URL` nao estiver definida, `npm run celular` tambem tenta preparar esse banco local automaticamente.

## Criar no Render pelo painel

1. No Render, clique em **New > Postgres**.
2. Escolha a mesma regiao do Web Service.
3. Em **PostgreSQL Version**, selecione **18**.
4. Use, se quiser, `pet_identification` como database name.
5. Crie o banco.
6. No Web Service do app, va em **Environment** e adicione:

```text
DATABASE_URL=<Internal Database URL do Render>
SESSION_SECRET=<segredo longo>
NODE_ENV=production
ANALYTICS_ADMIN_TOKEN=<token longo>
ADMIN_EMAIL=<seu email>
```

Use a **Internal Database URL** quando o Web Service e o Postgres estiverem no Render e na mesma regiao. Se voce usar a **External Database URL**, mantenha `?sslmode=require`.

7. Faca **Manual Deploy > Clear build cache & deploy**.
8. Valide:

```text
https://SEU-SERVICO.onrender.com/api/live
https://SEU-SERVICO.onrender.com/api/health
```

## Criar no Render por Blueprint

O arquivo `render.yaml` ja cria:

- Web Service Node.
- Render Postgres com `postgresMajorVersion: "18"`.
- `DATABASE_URL` apontando para a connection string interna do banco.

No Render, use **New > Blueprint** e aponte para este repositorio.

Depois de criar, edite `ADMIN_EMAIL` no painel do Render.

## Migrar dados do MongoDB antigo

Faca primeiro um backup/export do MongoDB Atlas.

1. Garanta que o PostgreSQL novo esteja criado e vazio.
2. Defina as variaveis no PowerShell:

```powershell
$env:MONGODB_URI="mongodb+srv://USUARIO:SENHA@SEU-CLUSTER.mongodb.net/?retryWrites=true&w=majority"
$env:MONGODB_DB="pet_identification"
$env:DATABASE_URL="postgresql://USUARIO:SENHA@HOST:5432/pet_identification?sslmode=require"
```

3. Instale temporariamente o driver do Mongo para a migracao:

```powershell
npm install --no-save mongodb
```

4. Rode o migrador:

```powershell
npm run db:migrate:mongo
```

5. Confira o retorno com as contagens migradas.
6. Suba o app apontando apenas para `DATABASE_URL`.
7. Abra `/api/health` e faca login com uma conta antiga para validar.

O migrador copia `users`, `wallet_states`, `wallet_attachments` e `analytics_events`. Ele ignora `sync_chunks`, porque esses lotes eram temporarios.

## Trocar senha do PostgreSQL local

Se voce ainda consegue conectar:

```powershell
psql -U postgres -h 127.0.0.1 -p 5432
```

Dentro do `psql`:

```sql
ALTER USER postgres WITH PASSWORD 'nova_senha_forte';
```

Depois atualize sua `DATABASE_URL`:

```powershell
$env:DATABASE_URL="postgresql://postgres:nova_senha_forte@127.0.0.1:5432/pet_identification"
```

Se voce esqueceu a senha e nao consegue conectar no PostgreSQL instalado no Windows:

1. Abra `services.msc` e pare o servico `postgresql-x64-18`.
2. Encontre a pasta de dados, geralmente `C:\Program Files\PostgreSQL\18\data`.
3. Abra `pg_hba.conf` como Administrador.
4. Temporariamente, para conexao local, troque o metodo de autenticacao de `scram-sha-256` para `trust` nas linhas de `127.0.0.1/32` e `::1/128`.
5. Inicie o servico de novo.
6. Rode:

```powershell
psql -U postgres -h 127.0.0.1 -p 5432
```

7. Dentro do `psql`:

```sql
ALTER USER postgres WITH PASSWORD 'nova_senha_forte';
```

8. Pare o servico novamente, volte o `pg_hba.conf` para `scram-sha-256` e inicie o servico.

Importante: deixe `trust` somente pelo tempo necessario e apenas em ambiente local.

## Trocar credencial no Render

No Render, a forma correta e rotacionar credenciais:

1. Abra o banco no Render.
2. Va na pagina **Info**.
3. Em **Credentials**, clique em **New default credential**.
4. Atualize o Web Service para usar a nova `DATABASE_URL` ou faca um Blueprint sync se a variavel vier de `fromDatabase`.
5. Faca redeploy.
6. Depois que o app estiver usando a credencial nova, remova a credencial antiga.
