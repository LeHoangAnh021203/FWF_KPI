import { MongoClient, type Db } from "mongodb";

const connectionUri = process.env.MONGODB_URI ?? process.env.MONGO_URI;
const databaseName = process.env.MONGODB_DB ?? "fwf_kpi";

if (!connectionUri) {
  throw new Error("Missing MONGODB_URI or MONGO_URI environment variable.");
}

declare global {
  // eslint-disable-next-line no-var
  var __fwfMongoClientPromise__: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var __fwfMongoIndexPromise__: Promise<void> | undefined;
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

async function ensureMongoIndexes(db: Db) {
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }),
    db.collection("users").createIndex({ createdAt: 1 }),
    db.collection("people").createIndex({ teamId: 1, name: 1 }),
    db.collection("people").createIndex({ email: 1 }),
    db.collection("workspace_teams").createIndex({ memberIds: 1 }),
    db.collection("workspace_tasks").createIndex({ workspaceTeamId: 1, timePeriod: 1 }),
    db.collection("workspace_tasks").createIndex({ assigneeId: 1, updatedAt: -1 }),
    db.collection("schedules").createIndex({ workspaceTeamId: 1, dateKey: 1, startTime: 1 }),
    db.collection("schedules").createIndex({ attendeeIds: 1, dateKey: 1 }),
    db.collection("tests").createIndex({ createdAt: -1 }),
    db.collection("tests").createIndex({ createdByPersonId: 1, createdAt: -1 }),
    db.collection("documents").createIndex({ ownerId: 1, modifiedAt: -1 }),
    db.collection("chat_threads").createIndex({ participantIds: 1, updatedAt: -1 }),
    db.collection("chat_messages").createIndex({ threadId: 1, createdAt: -1 }),
    db.collection("person_notifications").createIndex({ personId: 1, createdAt: -1 }),
    db.collection("person_notifications").createIndex({ personId: 1, readAt: 1, createdAt: -1 }),
    db.collection("pending_registrations").createIndex({ email: 1 }),
    db.collection("pending_registrations").createIndex({ expiresAt: 1 }),
    db.collection("role_approval_requests").createIndex({ email: 1, status: 1 }),
    db.collection("role_approval_requests").createIndex({ status: 1, updatedAt: -1 })
  ]);
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  const db = client.db(databaseName);

  if (!global.__fwfMongoIndexPromise__) {
    global.__fwfMongoIndexPromise__ = ensureMongoIndexes(db);
  }

  await global.__fwfMongoIndexPromise__;
  return db;
}
