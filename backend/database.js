const { MongoClient, ServerApiVersion } = require("mongodb");

const DEFAULT_MONGODB_URI = "mongodb://127.0.0.1:27017";
const DEFAULT_MONGODB_DB = "pet_identification";

let clientPromise;

function getMongoUri() {
  const uri = process.env.MONGODB_URI || (process.env.VERCEL ? "" : DEFAULT_MONGODB_URI);
  if (!uri) throw new Error("MONGODB_URI nao configurado no ambiente da Vercel.");
  return uri;
}

function getDatabaseName() {
  return process.env.MONGODB_DB || DEFAULT_MONGODB_DB;
}

function formatDatabaseError(error) {
  const message = String(error?.message || "");
  if (error?.code === 11000) return "Este e-mail ja esta cadastrado.";
  if (error?.code === 8000 || /bad auth|authentication failed/i.test(message)) {
    return "O MongoDB recusou usuario ou senha. Confira o usuario, a senha e o encode da senha em MONGODB_URI no painel da Vercel.";
  }
  if (["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "ECONNRESET"].includes(error?.code)) {
    return "Nao foi possivel conectar ao MongoDB. Confira MONGODB_URI, a lista de IPs permitidos no Atlas e as credenciais.";
  }
  return message || "Erro desconhecido ao acessar o MongoDB.";
}

async function createPoolWithSchema() {
  if (!clientPromise) {
    const client = new MongoClient(getMongoUri(), {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
      },
      maxPoolSize: process.env.VERCEL ? 5 : 10,
      serverSelectionTimeoutMS: 10000
    });
    clientPromise = client.connect().catch((error) => {
      clientPromise = undefined;
      throw error;
    });
  }

  const client = await clientPromise;
  const database = client.db(getDatabaseName());
  await database.collection("users").createIndex({ email_normalized: 1 }, { unique: true });
  await database.collection("wallet_states").createIndex({ user_id: 1 }, { unique: true });
  await database.command({ ping: 1 });
  return { client, database };
}

module.exports = {
  createPoolWithSchema,
  formatDatabaseError,
  getDatabaseName,
  getMongoUri
};
