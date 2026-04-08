import { MongoClient, type Db } from "mongodb";

const connectionUri = process.env.MONGODB_URI ?? process.env.MONGO_URI;
const databaseName = process.env.MONGODB_DB ?? "fwf_kpi";

if (!connectionUri) {
  throw new Error("Missing MONGODB_URI or MONGO_URI environment variable.");
}

declare global {
  // eslint-disable-next-line no-var
  var __fwfMongoClientPromise__: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global.__fwfMongoClientPromise__) {
    const client = new MongoClient(connectionUri);
    global.__fwfMongoClientPromise__ = client.connect();
  }

  clientPromise = global.__fwfMongoClientPromise__;
} else {
  const client = new MongoClient(connectionUri);
  clientPromise = client.connect();
}

export async function getMongoClient() {
  return clientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(databaseName);
}
