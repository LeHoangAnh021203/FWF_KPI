import "server-only";

import { randomInt } from "node:crypto";
import { ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";
import {
  isAdminLikeRole,
  requiresApprovalRole,
  type Department,
  type UserAccount,
  type UserRole
} from "@/lib/auth";
import type { Document, Folder } from "@/lib/documents";
import { personDisplayRoles, teams as companyTeams, type Person } from "@/lib/people";
import type { Project, Task, TaskAttachment, TaskGroups, TimePeriod } from "@/components/workspace-context";
import {
  isOtpEmailConfigured,
  sendOtpEmail,
  sendRoleApprovalGrantedEmail,
  sendRoleApprovalRejectedEmail,
  sendRoleApprovalRequestEmail
} from "@/lib/server/mailer";
import type { AppRealtimeEntityType, AppRealtimeEventAction, AppRealtimeEventType } from "@/lib/server/realtime";

type DbUser = {
  _id: string;
  name: string;
  email: string;
  password: string;
  personId?: string | null;
  role: StoredUserRole;
  department: Department;
  verified: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type StoredUserRole = UserRole | "boss" | "manager" | "store_staff";

type DbPerson = {
  _id: string;
  name: string;
  role: string;
  email: string;
  imageURL: string;
  teamId: string;
  workingHours: Person["workingHours"];
};

type DbCompanyTeam = {
  _id: string;
  name: string;
  color: string;
  memberIds?: string[];
};

type DbWorkspaceTeam = {
  _id: string;
  name: string;
  slug?: string;
  color: string;
  memberIds: string[];
  ownerId?: string;
  visibility?: string;
  createdAt?: string;
  updatedAt?: string;
};

type DbTask = {
  _id: string;
  taskNumber: number;
  workspaceTeamId: string;
  timePeriod: TimePeriod;
  name: string;
  comments: number;
  likes: number;
  assigneeId: string;
  status: Task["status"];
  statusColor: string;
  executionPeriod: string;
  audience: string;
  weight: string;
  resultMethod: string;
  target?: string;
  progress?: number;
  kpis: string[];
  childGoal: string;
  parentGoal: string;
  description: string;
  attachments: TaskAttachment[];
  createdAt?: string;
  updatedAt?: string;
};

type DbDocument = {
  _id: string;
  name: string;
  type: Document["type"];
  size: number;
  ownerId: string;
  createdAt: string;
  modifiedAt: string;
  folder?: string;
  folderId?: string;
  tags: string[];
  isStarred: boolean;
  thumbnail?: string | null;
  description?: string;
  url?: string;
  visibility?: "team" | "office" | "store" | "specific";
  visibleToPersonIds?: string[];
};

type DbFolder = {
  _id: string;
  name: string;
  ownerId: string;
  teamId: string;
  createdAt: string;
  updatedAt: string;
};

type DbChatThread = {
  _id: string;
  type: "individual";
  participantIds: string[];
  teamId: string;
  lastMessage: string;
  lastMessageAt: string;
  createdAt?: string;
  updatedAt?: string;
};

type DbChatMessage = {
  _id: string;
  threadId: string;
  senderId: string;
  type: "text" | "image" | "file";
  content: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  status: "sent" | "delivered" | "read";
  createdAt: string;
};

type DbSchedule = {
  _id: string;
  workspaceTeamId: string;
  dateKey: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  attendeeIds: string[];
  createdByPersonId: string;
  createdAt: string;
  updatedAt: string;
};

type DbPersonNotification = {
  _id?: ObjectId;
  personId: string;
  type: AppRealtimeEventType;
  actorId: string;
  action?: AppRealtimeEventAction;
  entityType?: AppRealtimeEntityType;
  entityLabel?: string;
  threadId?: string;
  projectId?: string;
  scheduleId?: string;
  entityId?: string;
  messageId?: string;
  targetPersonIds?: string[];
  occurredAt: string;
  createdAt: string;
  readAt?: string | null;
};

type PendingRegistration = {
  _id?: ObjectId;
  email: string;
  name: string;
  role: UserRole;
  department: Department;
  otp: string;
  expiresAt: string;
  createdAt: string;
};

type PendingLoginOtp = {
  _id?: ObjectId;
  email: string;
  otp: string;
  expiresAt: string;
  createdAt: string;
};

type DbRoleApprovalRequest = {
  _id?: ObjectId;
  email: string;
  name: string;
  role: UserRole;
  department: Department;
  status: "pending" | "approved" | "rejected";
  approverUserId?: string;
  otpVerifiedAt: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
};

type SessionActor = {
  user: UserAccount;
  person: Person;
  teamMembers: Person[];
  isLeader: boolean;
  isAdmin: boolean;
};

export type CompanyTeamRecord = {
  id: string;
  name: string;
  color: string;
  memberIds: string[];
};

export type DirectoryPayload = {
  people: Person[];
  teams: CompanyTeamRecord[];
};

export type ChatMessageRecord = {
  id: string;
  senderId: string;
  content: string;
  type: "text" | "image" | "file";
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  timestamp: string;
  status: "sent" | "delivered" | "read";
};

export type ChatThreadRecord = {
  id: string;
  type: "individual";
  participantIds: string[];
  teamId: string;
  lastMessage: string;
  lastMessageAt: string;
  messages: ChatMessageRecord[];
};

export type ScheduleRecord = {
  id: string;
  projectId: string;
  dateKey: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  attendeeIds: string[];
  createdByPersonId: string;
  createdAt: string;
  updatedAt: string;
};

export type AccountHistoryRecord = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: Department;
  status: "otp_pending" | "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  otpVerifiedAt?: string;
  expiresAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
};

export type UserNotificationRecord = {
  id: string;
  personId: string;
  type: AppRealtimeEventType;
  actorId: string;
  action?: AppRealtimeEventAction;
  entityType?: AppRealtimeEntityType;
  entityLabel?: string;
  threadId?: string;
  projectId?: string;
  scheduleId?: string;
  entityId?: string;
  messageId?: string;
  targetPersonIds?: string[];
  occurredAt: string;
  createdAt: string;
  readAt?: string | null;
  unread: boolean;
};

const supportedTeamIds = companyTeams.map((team) => team.id);
const supportedTeamIdSet = new Set(supportedTeamIds);
const supportedPersonRoleSet = new Set<string>(personDisplayRoles);
const DIRECTORY_SYNC_TTL_MS = 5 * 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var __fwfDirectorySyncState__:
    | {
        lastSyncedAt: number;
        inFlight?: Promise<void>;
      }
    | undefined;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeIdentityValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getEmailLocalPart(email: string) {
  return normalizeIdentityValue(email).split("@")[0] ?? "";
}

function normalizePersonDisplayRole(role: string) {
  const normalizedRole = normalizeIdentityValue(role);

  switch (normalizedRole) {
    case "nhan vien":
    case "nhân viên":
    case "employee":
    case "member":
    case "staff":
      return "Nhân viên";
    case "store_staff":
    case "nhan vien cua hang":
    case "nhân viên cửa hàng":
      return "Nhân viên cửa hàng";
    case "leader":
    case "lead":
    case "manager":
      return "Leader";
    case "admin":
    case "administrator":
      return "Admin";
    case "ceo":
    case "boss":
      return "CEO";
    default:
      return role.trim();
  }
}

function normalizeTeamId(teamId: string) {
  const normalizedTeamId = normalizeIdentityValue(teamId);

  if (supportedTeamIdSet.has(normalizedTeamId)) {
    return normalizedTeamId;
  }

  switch (normalizedTeamId) {
    case "it":
    case "development":
    case "dev":
      return "dev";
    case "marketing":
      return "marketing";
    case "hanh chinh - nhan su":
    case "hành chính - nhân sự":
    case "hr":
    case "design":
      return "design";
    case "ke toan":
    case "kế toán":
    case "accounting":
    case "qa":
    case "quality assurance":
      return "qa";
    case "van hanh":
    case "vận hành":
    case "operations":
    case "operation":
    case "product":
      return "product";
    case "sales":
      return "sales";
    default:
      return "product";
  }
}

async function syncCompanyDirectory(db: Awaited<ReturnType<typeof getMongoDb>>) {
  const [peopleDocuments, userDocuments] = await Promise.all([
    db.collection<DbPerson>("people").find({}).toArray(),
    db.collection<DbUser>("users").find({}).toArray()
  ]);

  const usersByPersonId = new Map<string, DbUser[]>();
  const usersByEmail = new Map<string, DbUser[]>();

  for (const user of userDocuments) {
    if (user.personId) {
      const matches = usersByPersonId.get(user.personId) ?? [];
      matches.push(user);
      usersByPersonId.set(user.personId, matches);
    }

    const normalizedEmail = normalizeEmail(user.email);
    const matches = usersByEmail.get(normalizedEmail) ?? [];
    matches.push(user);
    usersByEmail.set(normalizedEmail, matches);
  }

  const normalizedPeople = await Promise.all(
    peopleDocuments.map(async (person) => {
      const matchedUsers = usersByPersonId.get(person._id) ?? usersByEmail.get(normalizeEmail(person.email)) ?? [];
      const departmentDrivenTeamId =
        matchedUsers[0] ? mapDepartmentToTeamId(matchedUsers[0].department) : null;
      const nextTeamId = departmentDrivenTeamId ?? normalizeTeamId(person.teamId);
      const nextRole = normalizePersonDisplayRole(person.role);

      if (nextTeamId !== person.teamId || nextRole !== person.role) {
        await db.collection<DbPerson>("people").updateOne(
          { _id: person._id },
          { $set: { teamId: nextTeamId, role: nextRole } }
        );
      }

      if (matchedUsers.length > 0) {
        const nextDepartment = mapTeamIdToDepartment(nextTeamId);
        await db.collection<DbUser>("users").updateMany(
          {
            $or: [{ personId: person._id }, { email: person.email }]
          },
          {
            $set: {
              department: nextDepartment,
              updatedAt: new Date().toISOString()
            }
          }
        );
      }

      return {
        ...person,
        teamId: nextTeamId,
        role: nextRole
      };
    })
  );

  const memberIdsByTeam = new Map(companyTeams.map((team) => [team.id, [] as string[]]));
  for (const person of normalizedPeople) {
    const memberIds = memberIdsByTeam.get(person.teamId);
    if (memberIds) {
      memberIds.push(person._id);
    }
  }

  await Promise.all(
    companyTeams.map((team) =>
      db.collection<DbCompanyTeam>("company_teams").updateOne(
        { _id: team.id },
        {
          $set: {
            name: team.name,
            color: team.color,
            memberIds: memberIdsByTeam.get(team.id) ?? []
          }
        },
        { upsert: true }
      )
    )
  );
}

async function ensureCompanyDirectorySynced(
  db: Awaited<ReturnType<typeof getMongoDb>>,
  options?: { force?: boolean }
) {
  const now = Date.now();
  const state =
    global.__fwfDirectorySyncState__ ??
    (global.__fwfDirectorySyncState__ = { lastSyncedAt: 0 });

  if (!options?.force && state.lastSyncedAt && now - state.lastSyncedAt < DIRECTORY_SYNC_TTL_MS) {
    return;
  }

  if (!options?.force && state.inFlight) {
    await state.inFlight;
    return;
  }

  const syncPromise = syncCompanyDirectory(db)
    .then(() => {
      state.lastSyncedAt = Date.now();
    })
    .finally(() => {
      if (state.inFlight === syncPromise) {
        state.inFlight = undefined;
      }
    });

  state.inFlight = syncPromise;
  await syncPromise;
}

function findPersonForUser(user: UserAccount, people: Person[]) {
  if (user.personId) {
    const matchedById = people.find((person) => person.id === user.personId);
    if (matchedById) {
      return matchedById;
    }
  }

  const normalizedName = normalizeIdentityValue(user.name);
  const emailLocalPart = getEmailLocalPart(user.email);

  return (
    people.find(
      (person) =>
        normalizeIdentityValue(person.name) === normalizedName ||
        getEmailLocalPart(person.email) === emailLocalPart
    ) ?? null
  );
}

function getStatusColor(status: Task["status"]) {
  if (status === "Completed") {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
  }

  if (status === "In Progress") {
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
  }

  return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300";
}

function mapDepartmentToTeamId(department: Department) {
  switch (department) {
    case "Marketing":
      return "marketing";
    case "IT":
      return "dev";
    case "Vận hành":
      return "product";
    case "Kế toán":
      return "qa";
    case "Sales":
      return "sales";
    case "Hành chính - Nhân sự":
      return "design";
    case "Cửa hàng":
      return "store";
    default:
      return "product";
  }
}

function mapTeamIdToDepartment(teamId: string): Department {
  switch (teamId) {
    case "marketing":
      return "Marketing";
    case "dev":
      return "IT";
    case "qa":
      return "Kế toán";
    case "design":
      return "Hành chính - Nhân sự";
    case "product":
      return "Vận hành";
    case "sales":
      return "Sales";
    case "store":
      return "Cửa hàng";
    default:
      return "Vận hành";
  }
}

function mapDbUser(user: DbUser): UserAccount {
  const normalizedRole = normalizeUserRole(user.role);
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    password: user.password,
    personId: user.personId ?? undefined,
    role: normalizedRole,
    department: user.department,
    verified: user.verified
  };
}

function mapRequestedRoleToDisplayRole(role: UserRole) {
  if (role === "leader") {
    return "Leader";
  }

  if (role === "ceo") {
    return "CEO";
  }

  if (role === "admin") {
    return "Admin";
  }

  return "Nhân viên";
}

function mapRoleApprovalRequest(request: DbRoleApprovalRequest): AccountHistoryRecord {
  return {
    id: String(request._id),
    email: request.email,
    name: request.name,
    role: request.role,
    department: request.department,
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    otpVerifiedAt: request.otpVerifiedAt,
    approvedAt: request.approvedAt,
    rejectedAt: request.rejectedAt
  };
}

function mapPendingRegistration(record: PendingRegistration): AccountHistoryRecord {
  return {
    id: String(record._id ?? record.email),
    email: record.email,
    name: record.name,
    role: record.role,
    department: record.department,
    status: "otp_pending",
    createdAt: record.createdAt,
    updatedAt: record.createdAt,
    expiresAt: record.expiresAt
  };
}

function mapDbNotification(record: DbPersonNotification): UserNotificationRecord {
  return {
    id: String(record._id),
    personId: record.personId,
    type: record.type,
    actorId: record.actorId,
    action: record.action,
    entityType: record.entityType,
    entityLabel: record.entityLabel,
    threadId: record.threadId,
    projectId: record.projectId,
    scheduleId: record.scheduleId,
    entityId: record.entityId,
    messageId: record.messageId,
    targetPersonIds: record.targetPersonIds ?? [],
    occurredAt: record.occurredAt,
    createdAt: record.createdAt,
    readAt: record.readAt ?? null,
    unread: !record.readAt
  };
}

async function getRootApprover(db: Awaited<ReturnType<typeof getMongoDb>>) {
  const primaryAdmin = await db.collection<DbUser>("users").findOne(
    { role: "admin", verified: true },
    { sort: { createdAt: 1, _id: 1 } }
  );

  if (primaryAdmin) {
    return primaryAdmin;
  }

  return db.collection<DbUser>("users").findOne(
    { role: { $in: ["admin", "ceo", "boss"] }, verified: true },
    { sort: { createdAt: 1, _id: 1 } }
  );
}

async function createApprovedUserFromRequest(
  db: Awaited<ReturnType<typeof getMongoDb>>,
  request: Pick<DbRoleApprovalRequest, "name" | "email" | "role" | "department">
) {
  const existingUserCount = await db.collection<DbUser>("users").countDocuments();
  const nextUserId = `u-generated-${existingUserCount + 1}`;
  const now = new Date().toISOString();
  const normalizedEmail = normalizeEmail(request.email);
  const existingPerson = await db.collection<DbPerson>("people").findOne({ email: normalizedEmail });
  let personId = existingPerson?._id ?? null;

  if (!existingPerson) {
    personId = `people_generated_${Date.now()}`;
    const teamId = mapDepartmentToTeamId(request.department);
    await db.collection<DbPerson>("people").insertOne({
      _id: personId,
      name: request.name,
      role: mapRequestedRoleToDisplayRole(request.role),
      email: normalizedEmail,
      imageURL: "/placeholder.svg",
      teamId,
      workingHours: { start: "09:00", end: "17:00", timezone: "UTC+7" }
    });
  }

  const newUser: DbUser = {
    _id: nextUserId,
    name: request.name,
    email: normalizedEmail,
    password: "",
    personId,
    role: request.role,
    department: request.department,
    verified: true,
    createdAt: now,
    updatedAt: now
  };

  await db.collection<DbUser>("users").insertOne(newUser);
  return newUser;
}

function normalizeUserRole(role: StoredUserRole): UserRole {
  if (role === "manager") {
    return "leader";
  }

  if (role === "boss") {
    return "ceo";
  }

  return role;
}

function mapDbPerson(person: DbPerson): Person {
  return {
    id: person._id,
    name: person.name,
    role: normalizePersonDisplayRole(person.role),
    imageURL: person.imageURL,
    email: person.email,
    workingHours: person.workingHours,
    team: normalizeTeamId(person.teamId)
  };
}

function mapDbCompanyTeam(team: DbCompanyTeam): CompanyTeamRecord {
  return {
    id: team._id,
    name: team.name,
    color: team.color,
    memberIds: team.memberIds ?? []
  };
}

function mapDbWorkspaceTeam(team: DbWorkspaceTeam): Project {
  return {
    id: team._id,
    name: team.name,
    color: team.color,
    memberIds: team.memberIds ?? []
  };
}

function mapDbTask(task: DbTask): Task {
  return {
    id: task.taskNumber,
    projectId: task.workspaceTeamId,
    name: task.name,
    comments: task.comments,
    likes: task.likes,
    assigneeId: task.assigneeId,
    status: task.status,
    statusColor: task.statusColor || getStatusColor(task.status),
    executionPeriod: task.executionPeriod,
    audience: task.audience,
    weight: task.weight,
    resultMethod: task.resultMethod,
    target: task.target ?? "",
    progress: task.progress ?? 0,
    kpis: task.kpis ?? [],
    childGoal: task.childGoal,
    parentGoal: task.parentGoal,
    description: task.description,
    attachments: task.attachments ?? []
  };
}

function mapDbDocument(document: DbDocument): Document {
  return {
    id: document._id,
    name: document.name,
    type: document.type,
    size: document.size,
    ownerId: document.ownerId,
    createdAt: document.createdAt,
    modifiedAt: document.modifiedAt,
    folder: document.folder,
    folderId: document.folderId,
    tags: document.tags ?? [],
    isStarred: document.isStarred,
    thumbnail: document.thumbnail ?? undefined,
    description: document.description,
    url: document.url,
    visibility: document.visibility ?? "team",
    visibleToPersonIds: document.visibleToPersonIds ?? []
  };
}

function mapDbFolder(folder: DbFolder): Folder {
  return {
    id: folder._id,
    name: folder.name,
    ownerId: folder.ownerId,
    teamId: folder.teamId,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt
  };
}

function formatChatTimestamp(dateValue: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(dateValue));
}

function mapDbChatMessage(message: DbChatMessage): ChatMessageRecord {
  return {
    id: message._id,
    senderId: message.senderId,
    content: message.content,
    type: message.type,
    fileName: message.fileName,
    mimeType: message.mimeType,
    fileSize: message.fileSize,
    timestamp: formatChatTimestamp(message.createdAt),
    status: message.status
  };
}

function mapDbSchedule(schedule: DbSchedule): ScheduleRecord {
  return {
    id: schedule._id,
    projectId: schedule.workspaceTeamId,
    dateKey: schedule.dateKey,
    title: schedule.title,
    description: schedule.description,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    attendeeIds: schedule.attendeeIds,
    createdByPersonId: schedule.createdByPersonId,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt
  };
}

function createEmptyTaskGroups(): TaskGroups {
  return {
    "This Week": [],
    "Last Week": [],
    "This Month": []
  };
}

export async function getAuthState(userId?: string | null) {
  const db = await getMongoDb();
  const usersCollection = db.collection<DbUser>("users");

  const [users, user] = await Promise.all([
    usersCollection.find({}, { sort: { createdAt: 1 } }).toArray(),
    userId ? usersCollection.findOne({ _id: userId }) : Promise.resolve(null)
  ]);

  return {
    users: users.map(mapDbUser),
    user: user ? mapDbUser(user) : null
  };
}

export async function getAllRealtimePersonIds() {
  const db = await getMongoDb();
  const users = await db.collection<DbUser>("users").find(
    { personId: { $type: "string", $ne: "" } },
    { projection: { personId: 1 } }
  ).toArray();

  return Array.from(
    new Set(users.map((user) => user.personId).filter((personId): personId is string => Boolean(personId)))
  );
}

export async function getAdminRealtimePersonIds() {
  const db = await getMongoDb();
  const users = await db.collection<DbUser>("users").find(
    { personId: { $type: "string", $ne: "" } }
  ).toArray();

  return Array.from(
    new Set(
      users
        .map(mapDbUser)
        .filter((user) => isAdminLikeRole(user.role))
        .map((user) => user.personId)
        .filter((personId): personId is string => Boolean(personId))
    )
  );
}

export async function getWorkspaceRealtimePersonIds(projectId: string) {
  const db = await getMongoDb();
  const [project, adminPersonIds] = await Promise.all([
    db.collection<DbWorkspaceTeam>("workspace_teams").findOne({ _id: projectId }),
    getAdminRealtimePersonIds()
  ]);

  return Array.from(new Set([...(project?.memberIds ?? []), ...adminPersonIds]));
}

async function getSessionActor(sessionUserId?: string | null): Promise<SessionActor | null> {
  if (!sessionUserId) {
    return null;
  }

  const db = await getMongoDb();
  await ensureCompanyDirectorySynced(db);
  const [userDocument, peopleDocuments, userDocuments] = await Promise.all([
    db.collection<DbUser>("users").findOne({ _id: sessionUserId }),
    db.collection<DbPerson>("people").find({}).toArray(),
    db.collection<DbUser>("users").find({}).toArray()
  ]);

  if (!userDocument) {
    return null;
  }

  const user = mapDbUser(userDocument);
  const people = peopleDocuments.map(mapDbPerson);
  const usersByEmail = new Map(userDocuments.map((candidate) => [normalizeEmail(candidate.email), mapDbUser(candidate)]));
  const person = findPersonForUser(user, people);
  const isAdmin = isAdminLikeRole(user.role);
  const adminVisiblePersonIds = new Set(
    people
      .filter((candidate) => {
        const matchedUser = usersByEmail.get(normalizeEmail(candidate.email));
        return matchedUser ? isAdminLikeRole(matchedUser.role) : false;
      })
      .map((candidate) => candidate.id)
  );

  if (!person && !isAdmin) {
    return null;
  }

  const actorPerson: Person =
    person ?? {
      id: user.personId ?? `admin-${user.id}`,
      name: user.name,
      role: "Admin",
      email: user.email,
      imageURL: "/placeholder.svg",
      workingHours: { start: "09:00", end: "17:00", timezone: "UTC+7" },
      team: "all",
    };

  const isLeader =
    isAdmin || user.role === "leader" || actorPerson.role.toLowerCase() === "leader";
  const teamMembers = isAdmin
    ? people
    : people.filter((candidate) => {
        if (adminVisiblePersonIds.has(candidate.id)) return true;
        if (candidate.team === actorPerson.team) return true;
        // Leader Vận hành thấy được cả nhân viên cửa hàng
        if (isLeader && actorPerson.team === "product" && candidate.team === "store") return true;
        return false;
      });

  return {
    user,
    person: actorPerson,
    teamMembers,
    isLeader,
    isAdmin
  };
}

function canAccessPerson(actor: SessionActor, personId: string) {
  if (actor.isAdmin) {
    return true;
  }

  return actor.teamMembers.some((member) => member.id === personId);
}

function canManageTask(actor: SessionActor, task: DbTask) {
  if (actor.isAdmin) {
    return true;
  }

  if (actor.isLeader) {
    return canAccessPerson(actor, task.assigneeId);
  }

  return task.assigneeId === actor.person.id;
}

function canManageSchedules(actor: SessionActor) {
  return actor.isAdmin || actor.isLeader;
}

function canManageScheduleAttendees(actor: SessionActor, attendeeIds: string[]) {
  if (actor.isAdmin) {
    return true;
  }

  return attendeeIds.every((attendeeId) => canAccessPerson(actor, attendeeId));
}

function canViewSchedule(actor: SessionActor, schedule: DbSchedule) {
  if (actor.isAdmin) {
    return true;
  }

  if (actor.isLeader) {
    return canManageScheduleAttendees(actor, schedule.attendeeIds);
  }

  return schedule.attendeeIds.includes(actor.person.id);
}

export async function createLoginOtp(email: string) {
  const db = await getMongoDb();
  const normalizedEmail = normalizeEmail(email);

  const user = await db.collection<DbUser>("users").findOne({ email: normalizedEmail });
  if (!user) {
    const pendingApproval = await db.collection<DbRoleApprovalRequest>("role_approval_requests").findOne({
      email: normalizedEmail,
      status: "pending"
    });
    if (pendingApproval) {
      return { ok: false, message: "Tài khoản đã xác thực OTP và đang chờ admin gốc duyệt." };
    }

    return { ok: false, message: "Không tìm thấy tài khoản phù hợp." };
  }

  if (!user.verified) {
    return { ok: false, message: "Tài khoản chưa xác minh email bằng OTP." };
  }

  const otp = `${randomInt(100000, 1000000)}`;
  const now = new Date();
  const payload: PendingLoginOtp = {
    email: normalizedEmail,
    otp,
    expiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
    createdAt: now.toISOString()
  };

  await db.collection<PendingLoginOtp>("pending_login_otps").updateOne(
    { email: normalizedEmail },
    { $set: payload },
    { upsert: true }
  );

  try {
    if (!isOtpEmailConfigured()) {
      if (process.env.OTP_DEBUG === "true") {
        return { ok: true, message: "OTP đăng nhập đã được tạo ở chế độ debug.", otp };
      }

      await db.collection<PendingLoginOtp>("pending_login_otps").deleteOne({ email: normalizedEmail });
      return { ok: false, message: "Chưa cấu hình SMTP để gửi OTP thật." };
    }

    await sendOtpEmail({
      email: normalizedEmail,
      name: user.name.trim(),
      otp
    });

    return { ok: true, message: "OTP đăng nhập đã được gửi tới email công ty." };
  } catch {
    await db.collection<PendingLoginOtp>("pending_login_otps").deleteOne({ email: normalizedEmail });
    return { ok: false, message: "Không thể gửi OTP qua email. Vui lòng kiểm tra cấu hình SMTP." };
  }
}

export async function createRegistrationOtp(input: {
  name: string;
  email: string;
  role: UserRole;
  department: Department;
}) {
  const db = await getMongoDb();
  const normalizedEmail = normalizeEmail(input.email);

  const existingUser = await db.collection<DbUser>("users").findOne({ email: normalizedEmail });
  if (existingUser) {
    return { ok: false, message: "Email này đã tồn tại." };
  }

  const existingApprovalRequest = await db.collection<DbRoleApprovalRequest>("role_approval_requests").findOne({
    email: normalizedEmail,
    status: "pending"
  });
  if (existingApprovalRequest) {
    return { ok: false, message: "Tài khoản này đang chờ admin gốc duyệt." };
  }

  const otp = `${randomInt(100000, 1000000)}`;
  const now = new Date();
  const payload: PendingRegistration = {
    email: normalizedEmail,
    name: input.name.trim(),
    role: input.role,
    department: input.department,
    otp,
    expiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
    createdAt: now.toISOString()
  };

  await db.collection<PendingRegistration>("pending_registrations").updateOne(
    { email: normalizedEmail },
    { $set: payload },
    { upsert: true }
  );

  try {
    if (!isOtpEmailConfigured()) {
      if (process.env.OTP_DEBUG === "true") {
        return { ok: true, message: "OTP đã được tạo ở chế độ debug.", otp };
      }

      await db.collection<PendingRegistration>("pending_registrations").deleteOne({ email: normalizedEmail });
      return { ok: false, message: "Chưa cấu hình SMTP để gửi OTP thật." };
    }

    await sendOtpEmail({
      email: normalizedEmail,
      name: input.name.trim(),
      otp
    });

    return { ok: true, message: "OTP đã được gửi tới email công ty." };
  } catch {
    await db.collection<PendingRegistration>("pending_registrations").deleteOne({ email: normalizedEmail });
    return { ok: false, message: "Không thể gửi OTP qua email. Vui lòng kiểm tra cấu hình SMTP." };
  }
}

export async function verifyRegistrationOtp(email: string, otp: string) {
  const db = await getMongoDb();
  const normalizedEmail = normalizeEmail(email);
  const pending = await db.collection<PendingRegistration>("pending_registrations").findOne({ email: normalizedEmail });

  if (!pending) {
    return { ok: false, message: "Không tìm thấy yêu cầu xác minh phù hợp." };
  }

  if (Date.now() > new Date(pending.expiresAt).getTime()) {
    await db.collection<PendingRegistration>("pending_registrations").deleteOne({ email: normalizedEmail });
    return { ok: false, message: "OTP đã hết hạn. Vui lòng gửi lại OTP." };
  }

  if (pending.otp !== otp.trim()) {
    return { ok: false, message: "OTP không chính xác." };
  }

  const now = new Date().toISOString();

  if (requiresApprovalRole(pending.role)) {
    const rootApprover = await getRootApprover(db);
    const approvalPayload: DbRoleApprovalRequest = {
      email: normalizedEmail,
      name: pending.name,
      role: pending.role,
      department: pending.department,
      status: "pending",
      approverUserId: rootApprover?._id,
      otpVerifiedAt: now,
      createdAt: now,
      updatedAt: now
    };

    await db.collection<DbRoleApprovalRequest>("role_approval_requests").updateOne(
      { email: normalizedEmail, status: "pending" },
      { $set: approvalPayload },
      { upsert: true }
    );

    await db.collection<PendingRegistration>("pending_registrations").deleteOne({ email: normalizedEmail });

    if (rootApprover && isOtpEmailConfigured()) {
      try {
        await sendRoleApprovalRequestEmail({
          to: rootApprover.email,
          requesterName: pending.name,
          requesterEmail: normalizedEmail,
          role: pending.role.toUpperCase(),
          department: pending.department
        });
      } catch {
        // Keep the approval request even if notification email fails.
      }
    }

    return {
      ok: true,
      requiresApproval: true,
      message: "OTP hợp lệ. Tài khoản đang chờ admin/CEO duyệt. Bạn sẽ nhận email khi được phê duyệt."
    };
  }

  const newUser = await createApprovedUserFromRequest(db, pending);
  await db.collection<PendingRegistration>("pending_registrations").deleteOne({ email: normalizedEmail });

  return { ok: true, user: mapDbUser(newUser) };
}

export async function verifyLoginOtp(email: string, otp: string) {
  const db = await getMongoDb();
  const normalizedEmail = normalizeEmail(email);
  const pending = await db.collection<PendingLoginOtp>("pending_login_otps").findOne({ email: normalizedEmail });

  if (!pending) {
    return { ok: false, message: "Không tìm thấy yêu cầu đăng nhập phù hợp." };
  }

  if (Date.now() > new Date(pending.expiresAt).getTime()) {
    await db.collection<PendingLoginOtp>("pending_login_otps").deleteOne({ email: normalizedEmail });
    return { ok: false, message: "OTP đã hết hạn. Vui lòng gửi lại OTP." };
  }

  if (pending.otp !== otp.trim()) {
    return { ok: false, message: "OTP không chính xác." };
  }

  const user = await db.collection<DbUser>("users").findOne({
    email: normalizedEmail,
    verified: true
  });

  await db.collection<PendingLoginOtp>("pending_login_otps").deleteOne({ email: normalizedEmail });

  if (!user) {
    return { ok: false, message: "Tài khoản không còn khả dụng." };
  }

  return { ok: true, user: mapDbUser(user) };
}

export async function getDirectory() {
  const db = await getMongoDb();
  await ensureCompanyDirectorySynced(db);
  const [people, teams] = await Promise.all([
    db.collection<DbPerson>("people").find({}, { sort: { name: 1 } }).toArray(),
    db.collection<DbCompanyTeam>("company_teams").find(
      { _id: { $in: supportedTeamIds } },
      { sort: { name: 1 } }
    ).toArray()
  ]);

  return {
    people: people.map(mapDbPerson),
    teams: teams.map(mapDbCompanyTeam)
  };
}

type PersonMutationInput = {
  name: string;
  role: string;
  email: string;
  imageURL?: string;
  team: string;
  workingHours: Person["workingHours"];
};

type SelfProfileMutationInput = {
  name: string;
  email: string;
  imageURL?: string;
  workingHours: Person["workingHours"];
};

async function requireAdminActor(sessionUserId?: string | null) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) {
    throw new Error("Unauthorized");
  }

  if (!actor.isAdmin) {
    throw new Error("Forbidden");
  }

  return actor;
}

export async function createPersonRecord(
  sessionUserId: string | null | undefined,
  input: PersonMutationInput
) {
  await requireAdminActor(sessionUserId);

  const db = await getMongoDb();
  await ensureCompanyDirectorySynced(db);
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedRole = normalizePersonDisplayRole(input.role);

  if (!supportedPersonRoleSet.has(normalizedRole)) {
    throw new Error("Role hiển thị không hợp lệ.");
  }

  const existingPerson = await db.collection<DbPerson>("people").findOne({ email: normalizedEmail });
  if (existingPerson) {
    throw new Error("Email nhân sự đã tồn tại.");
  }

  const team = await db.collection<DbCompanyTeam>("company_teams").findOne({ _id: input.team });
  if (!team) {
    throw new Error("Phòng ban không tồn tại.");
  }

  const personId = `people_generated_${Date.now()}`;
  const personDocument: DbPerson = {
    _id: personId,
    name: input.name.trim(),
    role: normalizedRole,
    email: normalizedEmail,
    imageURL: input.imageURL?.trim() || "/placeholder.svg",
    teamId: input.team,
    workingHours: input.workingHours
  };

  await db.collection<DbPerson>("people").insertOne(personDocument);
  await db.collection<DbCompanyTeam>("company_teams").updateOne(
    { _id: input.team },
    { $addToSet: { memberIds: personId } }
  );

  await db.collection<DbUser>("users").updateMany(
    { email: normalizedEmail },
    {
      $set: {
        personId,
        name: personDocument.name,
        department: mapTeamIdToDepartment(input.team),
        updatedAt: new Date().toISOString()
      }
    }
  );

  return mapDbPerson(personDocument);
}

export async function updatePersonRecord(
  sessionUserId: string | null | undefined,
  personId: string,
  updates: PersonMutationInput
) {
  await requireAdminActor(sessionUserId);

  const db = await getMongoDb();
  await ensureCompanyDirectorySynced(db);
  const existingPerson = await db.collection<DbPerson>("people").findOne({ _id: personId });
  if (!existingPerson) {
    return null;
  }

  const normalizedEmail = normalizeEmail(updates.email);
  const normalizedRole = normalizePersonDisplayRole(updates.role);

  if (!supportedPersonRoleSet.has(normalizedRole)) {
    throw new Error("Role hiển thị không hợp lệ.");
  }

  const duplicatePerson = await db.collection<DbPerson>("people").findOne({
    email: normalizedEmail,
    _id: { $ne: personId }
  });
  if (duplicatePerson) {
    throw new Error("Email nhân sự đã tồn tại.");
  }

  const nextTeam = await db.collection<DbCompanyTeam>("company_teams").findOne({ _id: updates.team });
  if (!nextTeam) {
    throw new Error("Phòng ban không tồn tại.");
  }

  const nextPayload: Partial<DbPerson> = {
    name: updates.name.trim(),
    role: normalizedRole,
    email: normalizedEmail,
    imageURL: updates.imageURL?.trim() || "/placeholder.svg",
    teamId: updates.team,
    workingHours: updates.workingHours
  };

  await db.collection<DbPerson>("people").updateOne({ _id: personId }, { $set: nextPayload });

  if (existingPerson.teamId !== updates.team) {
    await db.collection<DbCompanyTeam>("company_teams").updateOne(
      { _id: existingPerson.teamId },
      { $pull: { memberIds: personId } }
    );
    await db.collection<DbCompanyTeam>("company_teams").updateOne(
      { _id: updates.team },
      { $addToSet: { memberIds: personId } }
    );
  }

  await db.collection<DbUser>("users").updateMany(
    {
      $or: [{ personId }, { email: existingPerson.email }]
    },
    {
      $set: {
        personId,
        name: updates.name.trim(),
        email: normalizedEmail,
        department: mapTeamIdToDepartment(updates.team),
        updatedAt: new Date().toISOString()
      }
    }
  );

  const updatedPerson = await db.collection<DbPerson>("people").findOne({ _id: personId });
  return updatedPerson ? mapDbPerson(updatedPerson) : null;
}

export async function updateOwnProfile(
  sessionUserId: string | null | undefined,
  updates: SelfProfileMutationInput
) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) {
    throw new Error("Unauthorized");
  }

  const db = await getMongoDb();
  await ensureCompanyDirectorySynced(db);

  const existingPerson = await db.collection<DbPerson>("people").findOne({ _id: actor.person.id });
  if (!existingPerson) {
    throw new Error("Không tìm thấy hồ sơ nhân sự.");
  }

  const normalizedEmail = normalizeEmail(updates.email);

  const duplicatePerson = await db.collection<DbPerson>("people").findOne({
    email: normalizedEmail,
    _id: { $ne: actor.person.id }
  });
  if (duplicatePerson) {
    throw new Error("Email nhân sự đã tồn tại.");
  }

  await db.collection<DbPerson>("people").updateOne(
    { _id: actor.person.id },
    {
      $set: {
        name: updates.name.trim(),
        email: normalizedEmail,
        imageURL: updates.imageURL?.trim() || "/placeholder.svg",
        workingHours: updates.workingHours
      }
    }
  );

  await db.collection<DbUser>("users").updateOne(
    { _id: actor.user.id },
    {
      $set: {
        name: updates.name.trim(),
        email: normalizedEmail,
        updatedAt: new Date().toISOString()
      }
    }
  );

  const updatedPerson = await db.collection<DbPerson>("people").findOne({ _id: actor.person.id });
  return updatedPerson ? mapDbPerson(updatedPerson) : null;
}

export async function getPendingRoleApprovalRequests(sessionUserId: string | null | undefined) {
  const db = await getMongoDb();
  const rootApprover = await getRootApprover(db);
  if (!rootApprover || rootApprover._id !== sessionUserId) {
    throw new Error("Forbidden");
  }

  const requests = await db.collection<DbRoleApprovalRequest>("role_approval_requests").find(
    { status: "pending" },
    { sort: { createdAt: -1 } }
  ).toArray();

  return requests.map(mapRoleApprovalRequest);
}

export async function getRoleApprovalHistory(sessionUserId: string | null | undefined) {
  await requireAdminActor(sessionUserId);

  const db = await getMongoDb();
  const [requests, pendingRegistrations] = await Promise.all([
    db.collection<DbRoleApprovalRequest>("role_approval_requests").find(
      { status: { $in: ["pending", "approved", "rejected"] } },
      { sort: { updatedAt: -1, createdAt: -1 } }
    ).toArray(),
    db.collection<PendingRegistration>("pending_registrations").find(
      {},
      { sort: { createdAt: -1 } }
    ).toArray()
  ]);

  return [...requests.map(mapRoleApprovalRequest), ...pendingRegistrations.map(mapPendingRegistration)].sort((a, b) => {
    const aTime = new Date(a.updatedAt).getTime();
    const bTime = new Date(b.updatedAt).getTime();
    return bTime - aTime;
  });
}

export async function getUserNotifications(
  sessionUserId: string | null | undefined,
  options?: { limit?: number; unreadOnly?: boolean; cursor?: string }
) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) {
    throw new Error("Unauthorized");
  }

  const limit = Math.min(100, Math.max(1, options?.limit ?? 30));
  const db = await getMongoDb();
  const filter: {
    personId: string;
    readAt?: null;
    createdAt?: { $lt: string };
  } = { personId: actor.person.id };

  if (options?.unreadOnly) {
    filter.readAt = null;
  }

  if (options?.cursor) {
    filter.createdAt = { $lt: options.cursor };
  }

  const [records, unreadCount] = await Promise.all([
    db
      .collection<DbPersonNotification>("person_notifications")
      .find(filter, { sort: { createdAt: -1 }, limit: limit + 1 })
      .toArray(),
    db.collection<DbPersonNotification>("person_notifications").countDocuments({
      personId: actor.person.id,
      readAt: null
    })
  ]);

  const hasMore = records.length > limit;
  const visibleRecords = hasMore ? records.slice(0, limit) : records;
  const nextCursor = hasMore ? visibleRecords[visibleRecords.length - 1]?.createdAt ?? null : null;

  return {
    notifications: visibleRecords.map(mapDbNotification),
    hasMore,
    nextCursor,
    unreadCount
  };
}

export async function markUserNotificationsAsRead(
  sessionUserId: string | null | undefined,
  notificationIds?: string[]
) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) {
    throw new Error("Unauthorized");
  }

  const db = await getMongoDb();
  const now = new Date().toISOString();
  const baseFilter = { personId: actor.person.id, readAt: null as null };

  if (!notificationIds || notificationIds.length === 0) {
    const result = await db.collection<DbPersonNotification>("person_notifications").updateMany(baseFilter, {
      $set: { readAt: now }
    });
    return { updatedCount: result.modifiedCount };
  }

  const objectIds = notificationIds
    .map((id) => {
      try {
        return new ObjectId(id);
      } catch {
        return null;
      }
    })
    .filter((id): id is ObjectId => Boolean(id));

  if (objectIds.length === 0) {
    return { updatedCount: 0 };
  }

  const result = await db.collection<DbPersonNotification>("person_notifications").updateMany(
    {
      ...baseFilter,
      _id: { $in: objectIds }
    },
    { $set: { readAt: now } }
  );

  return { updatedCount: result.modifiedCount };
}

export async function approveRoleApprovalRequest(sessionUserId: string | null | undefined, requestId: string) {
  const db = await getMongoDb();
  const rootApprover = await getRootApprover(db);
  if (!rootApprover || rootApprover._id !== sessionUserId) {
    throw new Error("Forbidden");
  }

  const approvalRequest = await db.collection<DbRoleApprovalRequest>("role_approval_requests").findOne({
    _id: new ObjectId(requestId),
    status: "pending"
  });

  if (!approvalRequest) {
    throw new Error("Approval request not found.");
  }

  const existingUser = await db.collection<DbUser>("users").findOne({ email: approvalRequest.email });
  if (existingUser) {
    throw new Error("Email này đã tồn tại.");
  }

  const newUser = await createApprovedUserFromRequest(db, approvalRequest);
  const now = new Date().toISOString();

  await db.collection<DbRoleApprovalRequest>("role_approval_requests").updateOne(
    { _id: approvalRequest._id },
    {
      $set: {
        status: "approved",
        updatedAt: now,
        approvedAt: now,
        approverUserId: sessionUserId ?? approvalRequest.approverUserId
      }
    }
  );

  if (isOtpEmailConfigured()) {
    try {
      await sendRoleApprovalGrantedEmail({
        to: approvalRequest.email,
        name: approvalRequest.name,
        role: approvalRequest.role.toUpperCase()
      });
    } catch {
      // Approval is already complete even if the email cannot be sent.
    }
  }

  return mapDbUser(newUser);
}

export async function rejectRoleApprovalRequest(sessionUserId: string | null | undefined, requestId: string) {
  const db = await getMongoDb();
  const rootApprover = await getRootApprover(db);
  if (!rootApprover || rootApprover._id !== sessionUserId) {
    throw new Error("Forbidden");
  }

  const approvalRequest = await db.collection<DbRoleApprovalRequest>("role_approval_requests").findOne({
    _id: new ObjectId(requestId),
    status: "pending"
  });

  if (!approvalRequest) {
    throw new Error("Approval request not found.");
  }

  const now = new Date().toISOString();
  await db.collection<DbRoleApprovalRequest>("role_approval_requests").updateOne(
    { _id: approvalRequest._id },
    {
      $set: {
        status: "rejected",
        updatedAt: now,
        rejectedAt: now,
        approverUserId: sessionUserId ?? approvalRequest.approverUserId
      }
    }
  );

  if (isOtpEmailConfigured()) {
    try {
      await sendRoleApprovalRejectedEmail({
        to: approvalRequest.email,
        name: approvalRequest.name,
        role: approvalRequest.role.toUpperCase()
      });
    } catch {
      // Rejection should persist even if the email fails.
    }
  }

  return mapRoleApprovalRequest({
    ...approvalRequest,
    status: "rejected",
    updatedAt: now,
    rejectedAt: now,
    approverUserId: sessionUserId ?? approvalRequest.approverUserId
  });
}

export async function deletePersonRecord(
  sessionUserId: string | null | undefined,
  personId: string
) {
  await requireAdminActor(sessionUserId);

  const db = await getMongoDb();
  const existingPerson = await db.collection<DbPerson>("people").findOne({ _id: personId });
  if (!existingPerson) {
    return false;
  }

  await db.collection<DbPerson>("people").deleteOne({ _id: personId });
  await db.collection<DbCompanyTeam>("company_teams").updateMany(
    {},
    { $pull: { memberIds: personId } }
  );
  await db.collection<DbWorkspaceTeam>("workspace_teams").updateMany(
    {},
    { $pull: { memberIds: personId } }
  );
  await db.collection<DbTask>("tasks").deleteMany({ assigneeId: personId });
  await db.collection<DbDocument>("documents").deleteMany({ ownerId: personId });
  await db.collection<DbUser>("users").deleteMany({
    $or: [{ personId }, { email: existingPerson.email }]
  });

  const threads = await db.collection<DbChatThread>("chat_threads").find(
    { participantIds: personId },
    { projection: { _id: 1 } }
  ).toArray();
  const threadIds = threads.map((thread) => thread._id);

  if (threadIds.length > 0) {
    await db.collection<DbChatMessage>("chat_messages").deleteMany({ threadId: { $in: threadIds } });
    await db.collection<DbChatThread>("chat_threads").deleteMany({ _id: { $in: threadIds } });
  }

  return true;
}

export async function getWorkspaceData(sessionUserId?: string | null) {
  const actor = await getSessionActor(sessionUserId);
  const db = await getMongoDb();
  const [projects, tasks] = await Promise.all([
    db.collection<DbWorkspaceTeam>("workspace_teams").find({}, { sort: { createdAt: 1 } }).toArray(),
    db.collection<DbTask>("tasks").find({}, { sort: { taskNumber: 1 } }).toArray()
  ]);

  const visibleProjects = actor
    ? actor.isAdmin
      ? projects
      : projects.filter((project) => project.memberIds.includes(actor.person.id))
    : [];
  const visibleProjectIds = new Set(visibleProjects.map((project) => project._id));

  const projectTasks = tasks.reduce<Record<string, TaskGroups>>((acc, task) => {
    const projectId = task.workspaceTeamId;
    if (!visibleProjectIds.has(projectId)) {
      return acc;
    }

    if (actor && !canManageTask(actor, task)) {
      return acc;
    }

    if (!acc[projectId]) {
      acc[projectId] = createEmptyTaskGroups();
    }

    acc[projectId][task.timePeriod].push(mapDbTask(task));
    return acc;
  }, {});

  return {
    projects: visibleProjects.map(mapDbWorkspaceTeam),
    projectTasks
  };
}

export async function createWorkspaceTeam(sessionUserId: string | null | undefined, input: Omit<Project, "id">) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) {
    throw new Error("Unauthorized");
  }

  const validMemberIds = new Set(actor.teamMembers.map((member) => member.id));
  const normalizedMemberIds = Array.from(
    new Set(input.memberIds.filter((memberId) => validMemberIds.has(memberId)))
  );

  if (!actor.isAdmin && !normalizedMemberIds.includes(actor.person.id)) {
    normalizedMemberIds.unshift(actor.person.id);
  }

  const db = await getMongoDb();
  const now = new Date().toISOString();
  const nextId = new ObjectId().toString();
  const document: DbWorkspaceTeam = {
    _id: nextId,
    name: input.name,
    color: input.color,
    memberIds: normalizedMemberIds,
    ownerId: actor.person.id,
    visibility: "team",
    createdAt: now,
    updatedAt: now
  };

  await db.collection<DbWorkspaceTeam>("workspace_teams").insertOne(document);
  return mapDbWorkspaceTeam(document);
}

export async function createWorkspaceTask(sessionUserId: string | null | undefined, input: {
  projectId: string;
  timePeriod: TimePeriod;
  name: string;
  assigneeId: string;
  status: Task["status"];
  executionPeriod: string;
  audience: string;
  weight: string;
  resultMethod: string;
  target: string;
  progress: number;
  kpis: string[];
  childGoal: string;
  parentGoal: string;
  description: string;
  attachments: TaskAttachment[];
}) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) {
    throw new Error("Unauthorized");
  }

  const db = await getMongoDb();
  const project = await db.collection<DbWorkspaceTeam>("workspace_teams").findOne({ _id: input.projectId });
  if (!project || (!actor.isAdmin && !project.memberIds.includes(actor.person.id))) {
    throw new Error("Forbidden");
  }

  if (!actor.isLeader && !actor.isAdmin && input.assigneeId !== actor.person.id) {
    throw new Error("Forbidden");
  }

  if (!project.memberIds.includes(input.assigneeId) || !canAccessPerson(actor, input.assigneeId)) {
    throw new Error("Forbidden");
  }

  const maxTask = await db.collection<DbTask>("tasks").find({}, { sort: { taskNumber: -1 }, limit: 1 }).next();
  const nextTaskNumber = (maxTask?.taskNumber ?? 0) + 1;
  const now = new Date().toISOString();

  const document: DbTask = {
    _id: `task_${nextTaskNumber}`,
    taskNumber: nextTaskNumber,
    workspaceTeamId: input.projectId,
    timePeriod: input.timePeriod,
    name: input.name,
    comments: 0,
    likes: 0,
    assigneeId: input.assigneeId,
    status: input.status,
    statusColor: getStatusColor(input.status),
    executionPeriod: input.executionPeriod,
    audience: input.audience,
    weight: input.weight,
    resultMethod: input.resultMethod,
    target: input.target,
    progress: input.progress,
    kpis: input.kpis,
    childGoal: input.childGoal,
    parentGoal: input.parentGoal,
    description: input.description,
    attachments: input.attachments,
    createdAt: now,
    updatedAt: now
  };

  await db.collection<DbTask>("tasks").insertOne(document);
  return mapDbTask(document);
}

export async function updateWorkspaceTask(
  sessionUserId: string | null | undefined,
  taskNumber: number,
  updates: Partial<Omit<Task, "id" | "projectId">>
) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) {
    throw new Error("Unauthorized");
  }

  const db = await getMongoDb();
  const existingTask = await db.collection<DbTask>("tasks").findOne({ taskNumber });
  if (!existingTask || !canManageTask(actor, existingTask)) {
    return null;
  }

  if (!actor.isLeader && !actor.isAdmin && updates.assigneeId && updates.assigneeId !== actor.person.id) {
    throw new Error("Forbidden");
  }

  if (updates.assigneeId && !canAccessPerson(actor, updates.assigneeId)) {
    throw new Error("Forbidden");
  }

  const updatePayload: Partial<DbTask> = {};

  if (updates.name !== undefined) updatePayload.name = updates.name;
  if (updates.comments !== undefined) updatePayload.comments = updates.comments;
  if (updates.likes !== undefined) updatePayload.likes = updates.likes;
  if (updates.assigneeId !== undefined) updatePayload.assigneeId = updates.assigneeId;
  if (updates.status !== undefined) updatePayload.status = updates.status;
  if (updates.statusColor !== undefined) updatePayload.statusColor = updates.statusColor;
  if (updates.executionPeriod !== undefined) updatePayload.executionPeriod = updates.executionPeriod;
  if (updates.audience !== undefined) updatePayload.audience = updates.audience;
  if (updates.weight !== undefined) updatePayload.weight = updates.weight;
  if (updates.resultMethod !== undefined) updatePayload.resultMethod = updates.resultMethod;
  if (updates.target !== undefined) updatePayload.target = updates.target;
  if (updates.progress !== undefined) updatePayload.progress = updates.progress;
  if (updates.kpis !== undefined) updatePayload.kpis = updates.kpis;
  if (updates.childGoal !== undefined) updatePayload.childGoal = updates.childGoal;
  if (updates.parentGoal !== undefined) updatePayload.parentGoal = updates.parentGoal;
  if (updates.description !== undefined) updatePayload.description = updates.description;
  if (updates.attachments !== undefined) updatePayload.attachments = updates.attachments;

  if (updatePayload.status && !updatePayload.statusColor) {
    updatePayload.statusColor = getStatusColor(updatePayload.status);
  }

  updatePayload.updatedAt = new Date().toISOString();

  await db.collection<DbTask>("tasks").updateOne(
    { taskNumber },
    { $set: updatePayload }
  );

  const updatedTask = await db.collection<DbTask>("tasks").findOne({ taskNumber });
  return updatedTask ? mapDbTask(updatedTask) : null;
}

export async function getScheduleData(
  sessionUserId: string | null | undefined,
  projectId?: string | null
) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) {
    throw new Error("Unauthorized");
  }

  const db = await getMongoDb();
  const normalizedProjectId = projectId?.trim() || "general";
  const schedules = await db.collection<DbSchedule>("schedules").find(
    { workspaceTeamId: normalizedProjectId },
    { sort: { dateKey: 1, startTime: 1, createdAt: 1 } }
  ).toArray();

  return schedules.filter((schedule) => canViewSchedule(actor, schedule)).map(mapDbSchedule);
}

export async function createScheduleRecord(
  sessionUserId: string | null | undefined,
  input: {
    projectId?: string | null;
    dateKey: string;
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    attendeeIds: string[];
  }
) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) {
    throw new Error("Unauthorized");
  }

  if (!canManageSchedules(actor)) {
    throw new Error("Forbidden");
  }

  const attendeeIds = Array.from(new Set(input.attendeeIds));
  if (attendeeIds.length === 0 || !canManageScheduleAttendees(actor, attendeeIds)) {
    throw new Error("Forbidden");
  }

  const db = await getMongoDb();
  const normalizedProjectId = input.projectId?.trim() || "general";
  if (normalizedProjectId !== "general") {
    const project = await db.collection<DbWorkspaceTeam>("workspace_teams").findOne({ _id: normalizedProjectId });
    if (!project || (!actor.isAdmin && !project.memberIds.includes(actor.person.id))) {
      throw new Error("Forbidden");
    }
  }

  const now = new Date().toISOString();
  const document: DbSchedule = {
    _id: new ObjectId().toString(),
    workspaceTeamId: normalizedProjectId,
    dateKey: input.dateKey,
    title: input.title.trim(),
    description: input.description.trim(),
    startTime: input.startTime,
    endTime: input.endTime,
    attendeeIds,
    createdByPersonId: actor.person.id,
    createdAt: now,
    updatedAt: now
  };

  await db.collection<DbSchedule>("schedules").insertOne(document);
  return mapDbSchedule(document);
}

export async function updateScheduleRecord(
  sessionUserId: string | null | undefined,
  scheduleId: string,
  updates: {
    dateKey: string;
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    attendeeIds: string[];
  }
) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) {
    throw new Error("Unauthorized");
  }

  if (!canManageSchedules(actor)) {
    throw new Error("Forbidden");
  }

  const db = await getMongoDb();
  const existing = await db.collection<DbSchedule>("schedules").findOne({ _id: scheduleId });
  if (!existing || !canViewSchedule(actor, existing)) {
    throw new Error("Forbidden");
  }

  const attendeeIds = Array.from(new Set(updates.attendeeIds));
  if (attendeeIds.length === 0 || !canManageScheduleAttendees(actor, attendeeIds)) {
    throw new Error("Forbidden");
  }

  await db.collection<DbSchedule>("schedules").updateOne(
    { _id: scheduleId },
    {
      $set: {
        dateKey: updates.dateKey,
        title: updates.title.trim(),
        description: updates.description.trim(),
        startTime: updates.startTime,
        endTime: updates.endTime,
        attendeeIds,
        updatedAt: new Date().toISOString()
      }
    }
  );

  const updated = await db.collection<DbSchedule>("schedules").findOne({ _id: scheduleId });
  return updated ? mapDbSchedule(updated) : null;
}

export async function getScheduleRealtimeRecipients(
  sessionUserId: string | null | undefined,
  scheduleId: string
) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) {
    throw new Error("Unauthorized");
  }

  const db = await getMongoDb();
  const existing = await db.collection<DbSchedule>("schedules").findOne({ _id: scheduleId });
  if (!existing || !canViewSchedule(actor, existing)) {
    throw new Error("Forbidden");
  }

  const adminPersonIds = await getAdminRealtimePersonIds();

  return {
    personIds: Array.from(new Set([...existing.attendeeIds, existing.createdByPersonId, ...adminPersonIds])),
    projectId: existing.workspaceTeamId
  };
}

export async function deleteScheduleRecord(
  sessionUserId: string | null | undefined,
  scheduleId: string
) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) {
    throw new Error("Unauthorized");
  }

  if (!canManageSchedules(actor)) {
    throw new Error("Forbidden");
  }

  const db = await getMongoDb();
  const existing = await db.collection<DbSchedule>("schedules").findOne({ _id: scheduleId });
  if (!existing || !canViewSchedule(actor, existing)) {
    throw new Error("Forbidden");
  }

  await db.collection<DbSchedule>("schedules").deleteOne({ _id: scheduleId });
  return true;
}

export async function getDocumentsData(sessionUserId?: string | null, folderId?: string | null) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) return [];

  const db = await getMongoDb();

  const query: Record<string, unknown> = {};
  if (folderId !== undefined) query.folderId = folderId ?? null;

  const [allDocs, allPeople] = await Promise.all([
    db.collection<DbDocument>("documents").find(query, { sort: { modifiedAt: -1 } }).toArray(),
    db.collection<DbPerson>("people").find().toArray(),
  ]);

  const personTeamMap = new Map(allPeople.map((p) => [p._id, p.teamId]));
  // Vận hành leader: team "product" + isLeader
  const isVanHanhLeader = actor.isLeader && !actor.isAdmin && actor.person.team === "product";

  return allDocs
    .filter((doc) => {
      if (actor.isAdmin) return true;

      const visibility = doc.visibility ?? "team";

      if (visibility === "team") {
        const ownerTeam = personTeamMap.get(doc.ownerId);
        return actor.person.team === ownerTeam || doc.ownerId === actor.person.id;
      }
      if (visibility === "office") {
        return actor.person.team !== "store";
      }
      if (visibility === "store") {
        return actor.person.team === "store" || isVanHanhLeader;
      }
      // "specific"
      return (
        doc.ownerId === actor.person.id ||
        actor.isLeader ||
        (doc.visibleToPersonIds ?? []).includes(actor.person.id)
      );
    })
    .map(mapDbDocument);
}

export async function createDocumentRecord(
  sessionUserId: string | null | undefined,
  input: Partial<Document> & { name: string; type: Document["type"] }
) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) throw new Error("Unauthorized");
  if (!actor.isLeader) throw new Error("Forbidden");

  const now = new Date().toISOString();
  const nextDocument: DbDocument = {
    _id: `doc_${Date.now()}`,
    name: input.name,
    type: input.type,
    size: input.size ?? 0,
    ownerId: actor.person.id,
    createdAt: now,
    modifiedAt: now,
    folder: input.folder,
    folderId: input.folderId,
    tags: input.tags ?? [],
    isStarred: Boolean(input.isStarred),
    thumbnail: input.thumbnail ?? null,
    description: input.description,
    url: input.url,
    visibility: input.visibility ?? "team",
    visibleToPersonIds: input.visibleToPersonIds ?? []
  };

  const db = await getMongoDb();
  await db.collection<DbDocument>("documents").insertOne(nextDocument);
  return mapDbDocument(nextDocument);
}

export async function updateDocumentRecord(
  sessionUserId: string | null | undefined,
  documentId: string,
  updates: Partial<Document>
) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) throw new Error("Unauthorized");

  const db = await getMongoDb();
  const existing = await db.collection<DbDocument>("documents").findOne({ _id: documentId });
  if (!existing || !canAccessPerson(actor, existing.ownerId)) return null;
  if (!actor.isLeader && !actor.isAdmin && existing.ownerId !== actor.person.id) return null;

  const payload: Partial<DbDocument> = { modifiedAt: new Date().toISOString() };
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.folder !== undefined) payload.folder = updates.folder;
  if (updates.folderId !== undefined) payload.folderId = updates.folderId;
  if (updates.tags !== undefined) payload.tags = updates.tags;
  if (updates.isStarred !== undefined) payload.isStarred = updates.isStarred;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.thumbnail !== undefined) payload.thumbnail = updates.thumbnail;
  if (updates.visibility !== undefined) payload.visibility = updates.visibility;
  if (updates.visibleToPersonIds !== undefined) payload.visibleToPersonIds = updates.visibleToPersonIds;

  await db.collection<DbDocument>("documents").updateOne({ _id: documentId }, { $set: payload });
  const updated = await db.collection<DbDocument>("documents").findOne({ _id: documentId });
  return updated ? mapDbDocument(updated) : null;
}

export async function deleteDocumentRecord(sessionUserId: string | null | undefined, documentId: string) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) throw new Error("Unauthorized");

  const db = await getMongoDb();
  const existing = await db.collection<DbDocument>("documents").findOne({ _id: documentId });
  if (!existing || !canAccessPerson(actor, existing.ownerId)) return false;
  if (!actor.isLeader && !actor.isAdmin && existing.ownerId !== actor.person.id) return false;

  await db.collection<DbDocument>("documents").deleteOne({ _id: documentId });
  return true;
}

export async function getFoldersData(sessionUserId?: string | null) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) return [];

  const db = await getMongoDb();
  const folderQuery = actor.isAdmin ? {} : { teamId: actor.person.team };
  const folders = await db
    .collection<DbFolder>("document_folders")
    .find(folderQuery, { sort: { createdAt: -1 } })
    .toArray();
  return folders.map(mapDbFolder);
}

export async function createFolderRecord(
  sessionUserId: string | null | undefined,
  input: { name: string }
) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) throw new Error("Unauthorized");
  if (!actor.isLeader && !actor.isAdmin) throw new Error("Forbidden");

  const now = new Date().toISOString();
  const folder: DbFolder = {
    _id: `folder_${Date.now()}`,
    name: input.name.trim(),
    ownerId: actor.person.id,
    teamId: actor.person.team,
    createdAt: now,
    updatedAt: now
  };

  const db = await getMongoDb();
  await db.collection<DbFolder>("document_folders").insertOne(folder);
  return mapDbFolder(folder);
}

export async function deleteFolderRecord(sessionUserId: string | null | undefined, folderId: string) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) throw new Error("Unauthorized");
  if (!actor.isLeader && !actor.isAdmin) throw new Error("Forbidden");

  const db = await getMongoDb();
  const folder = await db.collection<DbFolder>("document_folders").findOne({ _id: folderId });
  if (!folder || folder.teamId !== actor.person.team) return false;

  await db.collection<DbFolder>("document_folders").deleteOne({ _id: folderId });
  await db.collection<DbDocument>("documents").updateMany(
    { folderId },
    { $unset: { folderId: "" } }
  );
  return true;
}

export async function getChatsForPerson(sessionUserId: string | null | undefined) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) {
    return [];
  }

  const personId = actor.person.id;
  const db = await getMongoDb();
  const rawThreads = await db.collection<DbChatThread>("chat_threads").find(
    { participantIds: personId },
    { sort: { updatedAt: -1 } }
  ).toArray();
  const visibleMemberIds = new Set(actor.teamMembers.map((member) => member.id));
  const threads = rawThreads.filter((thread) =>
    thread.participantIds.every((participantId) => visibleMemberIds.has(participantId))
  );

  const threadIds = threads.map((thread) => thread._id);
  const messages = await db.collection<DbChatMessage>("chat_messages").find(
    { threadId: { $in: threadIds } },
    { sort: { createdAt: 1 } }
  ).toArray();

  const messagesByThread = messages.reduce<Record<string, ChatMessageRecord[]>>((acc, message) => {
    const mappedMessage = mapDbChatMessage(message);
    acc[message.threadId] = [...(acc[message.threadId] ?? []), mappedMessage];
    return acc;
  }, {});

  return threads.map((thread) => ({
    id: thread._id,
    type: thread.type,
    participantIds: thread.participantIds,
    teamId: thread.teamId,
    lastMessage: thread.lastMessage,
    lastMessageAt: formatChatTimestamp(thread.lastMessageAt),
    messages: messagesByThread[thread._id] ?? []
  }));
}

export async function sendChatMessage({
  sessionUserId,
  threadId,
  senderId,
  content,
  type = "text",
  fileName,
  mimeType,
  fileSize
}: {
  sessionUserId: string | null | undefined;
  threadId: string;
  senderId: string;
  content: string;
  type?: "text" | "image" | "file";
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
}) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor || actor.person.id !== senderId) {
    throw new Error("Unauthorized");
  }

  const db = await getMongoDb();
  const thread = await db.collection<DbChatThread>("chat_threads").findOne({ _id: threadId });
  if (!thread || !thread.participantIds.includes(senderId) || !thread.participantIds.every((id) => canAccessPerson(actor, id))) {
    throw new Error("Forbidden");
  }

  const normalizedContent = content.trim();
  if (!normalizedContent) {
    throw new Error("Message content is required.");
  }

  if (type === "file" && !fileName) {
    throw new Error("File name is required.");
  }

  const now = new Date().toISOString();
  const messageId = `${threadId}_${Date.now()}`;
  const messageDocument: DbChatMessage = {
    _id: messageId,
    threadId,
    senderId,
    type,
    content: normalizedContent,
    fileName,
    mimeType,
    fileSize,
    status: "sent",
    createdAt: now
  };

  const lastMessagePreview =
    type === "image"
      ? "Da gui mot hinh anh"
      : type === "file"
        ? `Da gui tep: ${fileName ?? "file"}`
        : normalizedContent;

  await db.collection<DbChatMessage>("chat_messages").insertOne(messageDocument);
  await db.collection<DbChatThread>("chat_threads").updateOne(
    { _id: threadId },
    {
      $set: {
        lastMessage: lastMessagePreview,
        lastMessageAt: now,
        updatedAt: now
      }
    }
  );

  return mapDbChatMessage(messageDocument);
}

export async function markChatThreadAsRead(sessionUserId: string | null | undefined, threadId: string) {
  const actor = await getSessionActor(sessionUserId);
  const db = await getMongoDb();
  if (!actor) {
    throw new Error("Unauthorized");
  }

  const thread = await db.collection<DbChatThread>("chat_threads").findOne({ _id: threadId });
  if (!thread || !thread.participantIds.includes(actor.person.id)) {
    throw new Error("Forbidden");
  }

  await db.collection<DbChatMessage>("chat_messages").updateMany(
    { threadId, senderId: { $ne: actor.person.id }, status: { $ne: "read" } },
    { $set: { status: "read" } }
  );
}

export async function createOrGetChatThread(sessionUserId: string | null | undefined, teammateId: string) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) {
    throw new Error("Unauthorized");
  }

  if (!canAccessPerson(actor, teammateId) || teammateId === actor.person.id) {
    throw new Error("Forbidden");
  }

  const db = await getMongoDb();
  const participantIds = [actor.person.id, teammateId].sort();
  const threadId = participantIds.join("__");
  const now = new Date().toISOString();

  await db.collection<DbChatThread>("chat_threads").updateOne(
    { _id: threadId },
    {
      $setOnInsert: {
        _id: threadId,
        type: "individual",
        participantIds,
        teamId: actor.person.team,
        lastMessage: "",
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now
      }
    },
    { upsert: true }
  );

  return threadId;
}

export async function getChatThreadParticipantIds(sessionUserId: string | null | undefined, threadId: string) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) {
    throw new Error("Unauthorized");
  }

  const db = await getMongoDb();
  const thread = await db.collection<DbChatThread>("chat_threads").findOne({ _id: threadId });
  if (!thread || !thread.participantIds.includes(actor.person.id) || !thread.participantIds.every((id) => canAccessPerson(actor, id))) {
    throw new Error("Forbidden");
  }

  return thread.participantIds;
}

export async function deleteChatMessage(sessionUserId: string | null | undefined, threadId: string, messageId: string) {
  const actor = await getSessionActor(sessionUserId);
  if (!actor) {
    throw new Error("Unauthorized");
  }

  const db = await getMongoDb();
  const message = await db.collection<DbChatMessage>("chat_messages").findOne({ _id: messageId, threadId });
  if (!message || message.senderId !== actor.person.id) {
    return false;
  }

  await db.collection<DbChatMessage>("chat_messages").deleteOne({ _id: messageId, threadId });

  const lastMessage = await db.collection<DbChatMessage>("chat_messages").find(
    { threadId },
    { sort: { createdAt: -1 }, limit: 1 }
  ).next();

  await db.collection<DbChatThread>("chat_threads").updateOne(
    { _id: threadId },
    {
      $set: {
        lastMessage: lastMessage?.content ?? "",
        lastMessageAt: lastMessage?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
  );

  return true;
}
