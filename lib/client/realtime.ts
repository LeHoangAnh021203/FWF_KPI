"use client";

import Ably, { type InboundMessage } from "ably";

declare global {
  interface Window {
    __fwfAblyRealtime__?: InstanceType<typeof Ably.Realtime>;
    __fwfAblyEnabled__?: boolean;
    __fwfAblyEnabledPromise__?: Promise<boolean>;
  }
}

export function getRealtimeClient() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!window.__fwfAblyRealtime__) {
    window.__fwfAblyRealtime__ = new Ably.Realtime({
      authUrl: "/api/realtime/token",
      echoMessages: false,
      closeOnUnload: true
    });
  }

  return window.__fwfAblyRealtime__;
}

async function isRealtimeEnabled() {
  if (typeof window === "undefined") {
    return false;
  }

  if (typeof window.__fwfAblyEnabled__ === "boolean") {
    return window.__fwfAblyEnabled__;
  }

  if (!window.__fwfAblyEnabledPromise__) {
    window.__fwfAblyEnabledPromise__ = fetch("/api/realtime/status", {
      credentials: "include",
      cache: "no-store"
    })
      .then(async (response) => {
        if (!response.ok) {
          return false;
        }

        const payload = (await response.json()) as { enabled?: boolean };
        return Boolean(payload.enabled);
      })
      .catch(() => false)
      .then((enabled) => {
        window.__fwfAblyEnabled__ = enabled;
        return enabled;
      })
      .finally(() => {
        delete window.__fwfAblyEnabledPromise__;
      });
  }

  return window.__fwfAblyEnabledPromise__;
}

export function closeRealtimeClient() {
  if (typeof window === "undefined") {
    return;
  }

  window.__fwfAblyRealtime__?.close();
  delete window.__fwfAblyRealtime__;
  delete window.__fwfAblyEnabled__;
  delete window.__fwfAblyEnabledPromise__;
}

export function subscribeToPersonChannel(
  personId: string,
  listener: (message: InboundMessage) => void
) {
  let isCancelled = false;
  let cleanup = () => undefined;

  void isRealtimeEnabled().then((enabled) => {
    if (!enabled || isCancelled) {
      return;
    }

    const realtimeClient = getRealtimeClient();
    if (!realtimeClient || isCancelled) {
      return;
    }

    const channel = realtimeClient.channels.get(`person:${personId}`);
    channel
      .subscribe("app.updated", listener)
      .then(() => {
        cleanup = () => {
          channel.unsubscribe("app.updated", listener);
        };
      })
      .catch(() => {
        if (typeof window !== "undefined") {
          window.__fwfAblyEnabled__ = false;
        }
      });
  });

  return () => {
    isCancelled = true;
    cleanup();
  };
}
