import "server-only";

import Ably from "ably";

export type AppRealtimeEventType =
  | "chat.message.created"
  | "chat.message.deleted"
  | "chat.thread.read"
  | "directory.updated"
  | "workspace.updated"
  | "schedule.updated"
  | "approval.updated";

export type AppRealtimeEvent = {
  type: AppRealtimeEventType;
  actorId: string;
  threadId?: string;
  projectId?: string;
  scheduleId?: string;
  entityId?: string;
  messageId?: string;
  occurredAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __fwfAblyRestClient__: InstanceType<typeof Ably.Rest> | undefined;
}

function getAblyApiKey() {
  return process.env.ABLY_API_KEY?.trim() ?? "";
}

export function isRealtimeConfigured() {
  return getAblyApiKey().length > 0;
}

function getAblyRestClient() {
  if (!isRealtimeConfigured()) {
    throw new Error("Realtime is not configured.");
  }

  if (!global.__fwfAblyRestClient__) {
    global.__fwfAblyRestClient__ = new Ably.Rest({
      key: getAblyApiKey(),
      queryTime: true
    });
  }

  return global.__fwfAblyRestClient__;
}

export async function createRealtimeTokenRequest(clientId: string) {
  const client = getAblyRestClient();
  return client.auth.createTokenRequest({
    clientId,
    capability: JSON.stringify({
      [`person:${clientId}`]: ["subscribe"]
    })
  });
}

export async function publishAppEventToPersons(personIds: string[], event: AppRealtimeEvent) {
  const uniquePersonIds = Array.from(new Set(personIds.filter(Boolean)));
  if (!isRealtimeConfigured() || uniquePersonIds.length === 0) {
    return;
  }

  const client = getAblyRestClient();
  await Promise.allSettled(
    uniquePersonIds.map((participantId) =>
      client.channels.get(`person:${participantId}`).publish("app.updated", event)
    )
  );
}

export async function publishChatEvent(participantIds: string[], event: AppRealtimeEvent) {
  await publishAppEventToPersons(participantIds, event);
}
