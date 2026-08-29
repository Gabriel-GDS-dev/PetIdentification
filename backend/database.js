const fs = require("node:fs/promises");
const path = require("node:path");
const { Client, Pool } = require("pg");

const DEFAULT_DATABASE_URL = "postgres://postgres@127.0.0.1:55432/pet_identification";

function getDatabaseUrl() {
  return process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
}

function formatDatabaseError(error) {
  if (error?.code === "28P01") {
    return [
      "Falha de autenticacao no PostgreSQL.",
      "Confira a variavel DATABASE_URL ou remova-a para usar o banco local automatico na porta 55432."
    ].join("\n");
  }

  if (error?.code === "ECONNREFUSED") {
    return [
      "O PostgreSQL local nao esta em execucao.",
      "Rode 'npm run db:start' e tente novamente."
    ].join("\n");
  }

  return error?.message || "Erro desconhecido ao acessar o PostgreSQL.";
}

function getDatabaseName(databaseUrl = getDatabaseUrl()) {
  const parsed = new URL(databaseUrl);
  return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function ensureDatabase(databaseUrl = getDatabaseUrl()) {
  if (process.env.SKIP_DATABASE_CREATE === "true") return;

  const parsed = new URL(databaseUrl);
  const databaseName = getDatabaseName(databaseUrl);
  if (!databaseName || databaseName === "postgres") return;

  const maintenanceUrl = new URL(parsed);
  maintenanceUrl.pathname = "/postgres";

  const client = new Client({ connectionString: maintenanceUrl.toString() });
  await client.connect();
  try {
    const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [databaseName]);
    if (!existing.rowCount) {
      await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    }
  } finally {
    await client.end();
  }
}

const MIGRATION_SQL = `
  ALTER TABLE pet_travel_plans ADD COLUMN IF NOT EXISTS pet_id TEXT NOT NULL DEFAULT '';
  ALTER TABLE pet_travel_plans ADD COLUMN IF NOT EXISTS destination TEXT NOT NULL DEFAULT '';
  ALTER TABLE pet_travel_plans ADD COLUMN IF NOT EXISTS travel_date DATE;
  ALTER TABLE pet_travel_plans ADD COLUMN IF NOT EXISTS transport TEXT NOT NULL DEFAULT '';
  ALTER TABLE pet_travel_plans ADD COLUMN IF NOT EXISTS selected_pet_id TEXT NOT NULL DEFAULT '';
  ALTER TABLE pet_travel_plans ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';

  ALTER TABLE pet_travel_items ADD COLUMN IF NOT EXISTS pet_id TEXT NOT NULL DEFAULT '';
  ALTER TABLE pet_travel_items ADD COLUMN IF NOT EXISTS item_key TEXT NOT NULL DEFAULT '';
  ALTER TABLE pet_travel_items ADD COLUMN IF NOT EXISTS checked BOOLEAN NOT NULL DEFAULT false;

  ALTER TABLE pet_travel_plans DROP CONSTRAINT IF EXISTS pet_travel_plans_pkey;
  ALTER TABLE pet_travel_plans ADD CONSTRAINT pet_travel_plans_pkey PRIMARY KEY (user_id, pet_id);

  ALTER TABLE pet_travel_items DROP CONSTRAINT IF EXISTS pet_travel_items_pkey;
  ALTER TABLE pet_travel_items ADD CONSTRAINT pet_travel_items_pkey PRIMARY KEY (user_id, pet_id, item_key);
`;

async function applySchema(pool) {
  const schemaPath = path.join(__dirname, "db", "schema.sql");
  const schema = await fs.readFile(schemaPath, "utf8");
  await pool.query(schema);
  await pool.query(MIGRATION_SQL);
}

async function createPoolWithSchema() {
  const databaseUrl = getDatabaseUrl();
  await ensureDatabase(databaseUrl);
  const pool = new Pool({ connectionString: databaseUrl });
  await applySchema(pool);
  return pool;
}

module.exports = {
  applySchema,
  createPoolWithSchema,
  ensureDatabase,
  formatDatabaseError,
  getDatabaseName,
  getDatabaseUrl
};
