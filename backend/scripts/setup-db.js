const { Client } = require("pg");
const { applySchema, ensureDatabase, formatDatabaseError, getDatabaseName, getDatabaseUrl } = require("../database");

async function main() {
  const databaseUrl = getDatabaseUrl();
  await ensureDatabase(databaseUrl);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await applySchema(client);
    console.log(`Banco '${getDatabaseName(databaseUrl)}' pronto.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Nao foi possivel preparar o banco.");
  console.error(formatDatabaseError(error));
  process.exitCode = 1;
});
