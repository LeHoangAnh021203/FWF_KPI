import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { MongoClient } from "mongodb";

const rootDir = path.resolve(process.cwd());
const outputDir = path.join(rootDir, "database", "mongodb", "export");
const connectionUri = process.env.MONGODB_URI ?? process.env.MONGO_URI;
const databaseName = process.env.MONGODB_DB ?? "fwf_kpi";

function readFile(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function findAssignedLiteral(source, symbolName) {
  const symbolIndex = source.indexOf(symbolName);

  if (symbolIndex === -1) {
    throw new Error(`Could not find assignment for ${symbolName}`);
  }

  const equalsIndex = source.indexOf("=", symbolIndex);

  if (equalsIndex === -1) {
    throw new Error(`Could not find "=" for ${symbolName}`);
  }

  let index = equalsIndex + 1;
  while (/\s/.test(source[index])) {
    index += 1;
  }

  const opener = source[index];
  if (opener === '"' || opener === "'" || opener === "`") {
    let cursor = index + 1;
    let escaped = false;

    while (cursor < source.length) {
      const char = source[cursor];

      if (escaped) {
        escaped = false;
        cursor += 1;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        cursor += 1;
        continue;
      }

      if (char === opener) {
        return source.slice(index, cursor + 1);
      }

      cursor += 1;
    }
  }

  const closer = opener === "[" ? "]" : opener === "{" ? "}" : null;

  if (!closer) {
    throw new Error(`Unsupported literal opener "${opener}" for ${symbolName}`);
  }

  let depth = 0;
  let inString = false;
  let stringQuote = "";
  let escaped = false;
  let literal = "";

  for (let cursor = index; cursor < source.length; cursor += 1) {
    const char = source[cursor];
    literal += char;

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === stringQuote) {
        inString = false;
      }

      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = true;
      stringQuote = char;
      continue;
    }

    if (char === opener) {
      depth += 1;
    } else if (char === closer) {
      depth -= 1;
      if (depth === 0) {
        return literal;
      }
    }
  }

  throw new Error(`Could not parse literal for ${symbolName}`);
}

function evaluateLiteral(literal, context = {}) {
  return vm.runInNewContext(`(${literal})`, context);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filename, data) {
  fs.writeFileSync(path.join(outputDir, filename), `${JSON.stringify(data, null, 2)}\n`);
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildConversationId(participantIds) {
  return participantIds.slice().sort().join("__");
}

function deriveStatusColor(status) {
  if (status === "Completed") {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
  }

  if (status === "In Progress") {
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
  }

  return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300";
}

const authSource = readFile("lib/auth.ts");
const peopleSource = readFile("lib/people.ts");
const workspaceSource = readFile("components/workspace-context.tsx");

const seededUsers = evaluateLiteral(findAssignedLiteral(authSource, "seededUsers"));
const companyTeams = evaluateLiteral(findAssignedLiteral(peopleSource, "teams"));
const people = evaluateLiteral(findAssignedLiteral(peopleSource, "people"));
const workspaceTeams = evaluateLiteral(findAssignedLiteral(workspaceSource, "initialProjects"));
const currentUserIdLiteral = evaluateLiteral(findAssignedLiteral(workspaceSource, "CURRENT_USER_ID"));
const initialProjectTasksLiteral = findAssignedLiteral(workspaceSource, "initialProjectTasks").replaceAll(
  "CURRENT_USER_ID",
  JSON.stringify(currentUserIdLiteral),
);
const projectTasks = evaluateLiteral(initialProjectTasksLiteral);

const validPersonIds = new Set(people.map((person) => person.id));
const fallbackPerson = people.find((person) => person.role.toLowerCase() === "leader") ?? people[0];
const nowIso = new Date().toISOString();

function normalizePersonId(personId) {
  return validPersonIds.has(personId) ? personId : fallbackPerson.id;
}

async function loadDocumentsCollection() {
  if (!connectionUri) {
    throw new Error("Missing MONGODB_URI or MONGO_URI. Cannot export real documents data.");
  }

  const client = new MongoClient(connectionUri);

  try {
    await client.connect();
    const rawDocuments = await client
      .db(databaseName)
      .collection("documents")
      .find({}, { sort: { modifiedAt: -1 } })
      .toArray();

    return rawDocuments.map((document) => {
      const ownerId =
        typeof document.ownerId === "string" && validPersonIds.has(document.ownerId)
          ? document.ownerId
          : fallbackPerson.id;
      const createdAt =
        typeof document.createdAt === "string" && document.createdAt.trim()
          ? document.createdAt
          : nowIso;
      const modifiedAt =
        typeof document.modifiedAt === "string" && document.modifiedAt.trim()
          ? document.modifiedAt
          : createdAt;

      return {
        _id: String(document._id),
        name: typeof document.name === "string" && document.name.trim() ? document.name : "Untitled",
        type: typeof document.type === "string" ? document.type : "txt",
        size: typeof document.size === "number" ? document.size : 0,
        ownerId,
        createdAt,
        modifiedAt,
        folder: typeof document.folder === "string" ? document.folder : null,
        folderId: typeof document.folderId === "string" ? document.folderId : null,
        tags: Array.isArray(document.tags)
          ? document.tags.filter((tag) => typeof tag === "string")
          : [],
        isStarred: Boolean(document.isStarred),
        thumbnail: typeof document.thumbnail === "string" ? document.thumbnail : null,
        description: typeof document.description === "string" ? document.description : "",
        url: typeof document.url === "string" ? document.url : undefined,
        visibility:
          document.visibility === "team" ||
          document.visibility === "office" ||
          document.visibility === "store" ||
          document.visibility === "specific"
            ? document.visibility
            : "team",
        visibleToPersonIds: Array.isArray(document.visibleToPersonIds)
          ? document.visibleToPersonIds.filter((personId) => typeof personId === "string")
          : [],
      };
    });
  } finally {
    await client.close();
  }
}

const usersCollection = seededUsers.map((user) => ({
  _id: user.id,
  name: user.name,
  email: user.email,
  password: user.password,
  personId: user.personId ?? null,
  role: user.role,
  department: user.department,
  verified: user.verified,
  createdAt: nowIso,
  updatedAt: nowIso,
}));

const peopleCollection = people.map((person) => ({
  _id: person.id,
  name: person.name,
  role: person.role,
  email: person.email,
  imageURL: person.imageURL,
  teamId: person.team,
  workingHours: person.workingHours,
  createdAt: nowIso,
  updatedAt: nowIso,
}));

const companyTeamsCollection = companyTeams.map((team) => ({
  _id: team.id,
  name: team.name,
  color: team.color,
  memberIds: people.filter((person) => person.team === team.id).map((person) => person.id),
  createdAt: nowIso,
  updatedAt: nowIso,
}));

const workspaceTeamsCollection = workspaceTeams.map((team) => {
  const normalizedMemberIds = Array.from(
    new Set((team.memberIds ?? []).map((memberId) => normalizePersonId(memberId))),
  );

  return {
    _id: team.id,
    name: team.name,
    slug: slugify(team.name),
    color: team.color,
    memberIds: normalizedMemberIds,
    ownerId: normalizedMemberIds[0] ?? fallbackPerson.id,
    visibility: "team",
    createdAt: nowIso,
    updatedAt: nowIso,
  };
});

const tasksCollection = Object.entries(projectTasks).flatMap(([projectId, taskGroups]) =>
  Object.entries(taskGroups).flatMap(([timePeriod, tasks]) =>
    tasks.map((task) => {
      const progress =
        typeof task.progress === "number"
          ? Math.max(0, Math.min(100, task.progress))
          : task.status === "Completed"
            ? 100
            : task.status === "In Progress"
              ? 65
              : 0;

      return {
        _id: `task_${task.id}`,
        taskNumber: task.id,
        workspaceTeamId: projectId,
        timePeriod,
        name: task.name,
        comments: task.comments,
        likes: task.likes,
        assigneeId: normalizePersonId(task.assigneeId),
        status: task.status,
        statusColor: task.statusColor || deriveStatusColor(task.status),
        executionPeriod: task.executionPeriod,
        audience: task.audience,
        weight: task.weight,
        resultMethod: task.resultMethod,
        target: task.target ?? "",
        progress,
        kpis: task.kpis ?? [],
        childGoal: task.childGoal,
        parentGoal: task.parentGoal,
        description: task.description,
        attachments: task.attachments ?? [],
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    }),
  ),
);

const documentsCollection = await loadDocumentsCollection();

const marketingPeople = people.filter((person) => person.team === "marketing");
const chatThreadsCollection = [];
const chatMessagesCollection = [];

marketingPeople.forEach((person, index) => {
  marketingPeople.slice(index + 1).forEach((otherPerson) => {
    const participantIds = [person.id, otherPerson.id];
    const threadId = buildConversationId(participantIds);

    chatThreadsCollection.push({
      _id: threadId,
      type: "individual",
      participantIds,
      teamId: "marketing",
      lastMessage: `Cập nhật tiến độ task giữa ${person.name} và ${otherPerson.name}`,
      lastMessageAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    const firstTimestamp = new Date("2026-04-07T09:00:00+07:00").toISOString();
    const secondTimestamp = new Date("2026-04-07T09:15:00+07:00").toISOString();

    chatMessagesCollection.push(
      {
        _id: `${threadId}_1`,
        threadId,
        senderId: person.id,
        type: "text",
        content: `Chào ${otherPerson.name}, mình đang cập nhật tiến độ task hôm nay.`,
        status: "read",
        createdAt: firstTimestamp,
      },
      {
        _id: `${threadId}_2`,
        threadId,
        senderId: otherPerson.id,
        type: "text",
        content: `Ok ${person.name}, có gì cần hỗ trợ thì cập nhật tiếp trong thread này nhé.`,
        status: "read",
        createdAt: secondTimestamp,
      },
    );
  });
});

const manifest = {
  generatedAt: nowIso,
  databaseName,
  collections: [
    { name: "company_teams", count: companyTeamsCollection.length },
    { name: "people", count: peopleCollection.length },
    { name: "users", count: usersCollection.length },
    { name: "workspace_teams", count: workspaceTeamsCollection.length },
    { name: "tasks", count: tasksCollection.length },
    { name: "documents", count: documentsCollection.length },
    { name: "chat_threads", count: chatThreadsCollection.length },
    { name: "chat_messages", count: chatMessagesCollection.length },
  ],
};

ensureDir(outputDir);

writeJson("company_teams.json", companyTeamsCollection);
writeJson("people.json", peopleCollection);
writeJson("users.json", usersCollection);
writeJson("workspace_teams.json", workspaceTeamsCollection);
writeJson("tasks.json", tasksCollection);
writeJson("documents.json", documentsCollection);
writeJson("chat_threads.json", chatThreadsCollection);
writeJson("chat_messages.json", chatMessagesCollection);
writeJson("manifest.json", manifest);

console.log(`MongoDB seed exported to ${outputDir}`);
