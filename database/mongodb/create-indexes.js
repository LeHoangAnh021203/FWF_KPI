db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ personId: 1 }, { unique: true, sparse: true });

db.people.createIndex({ email: 1 }, { unique: true });
db.people.createIndex({ teamId: 1 });

db.company_teams.createIndex({ name: 1 }, { unique: true });

db.workspace_teams.createIndex({ slug: 1 }, { unique: true });
db.workspace_teams.createIndex({ memberIds: 1 });

db.tasks.createIndex({ workspaceTeamId: 1, timePeriod: 1 });
db.tasks.createIndex({ assigneeId: 1, status: 1 });
db.tasks.createIndex({ parentGoal: 1 });

db.documents.createIndex({ ownerId: 1, modifiedAt: -1 });
db.documents.createIndex({ tags: 1 });

db.chat_threads.createIndex({ participantIds: 1 });
db.chat_messages.createIndex({ threadId: 1, createdAt: 1 });
