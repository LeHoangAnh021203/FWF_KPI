import type { UserAccount } from "@/lib/auth";
import type { Person } from "@/lib/people";

export type BootstrapTeamRecord = {
  id: string;
  name: string;
  color: string;
  memberIds: string[];
};

export type BootstrapTaskAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
};

export type BootstrapTask = {
  id: number;
  projectId: string;
  name: string;
  comments: number;
  likes: number;
  assigneeId: string;
  status: string;
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
  attachments: BootstrapTaskAttachment[];
};

export type BootstrapTimePeriod = "This Week" | "Last Week" | "This Month";

export type BootstrapTaskGroups = Record<BootstrapTimePeriod, BootstrapTask[]>;

export type BootstrapProject = {
  id: string;
  name: string;
  color: string;
  memberIds: string[];
};

export type AppBootstrapPayload = {
  user: UserAccount | null;
  currentUserId: string;
  people: Person[];
  teams: BootstrapTeamRecord[];
  projects: BootstrapProject[];
  projectTasks: Record<string, BootstrapTaskGroups>;
};
