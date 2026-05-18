const { Client } = require("pg");
const { applySchema, ensureDatabase, getDatabaseName, getDatabaseUrl } = require("../database");

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
  console.error(error.message);
  process.exitCode = 1;
});
