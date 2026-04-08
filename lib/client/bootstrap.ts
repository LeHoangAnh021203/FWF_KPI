"use client";

import type { AppBootstrapPayload } from "@/lib/app-bootstrap";

let bootstrapCache: AppBootstrapPayload | null = null;
let bootstrapPromise: Promise<AppBootstrapPayload> | null = null;

async function fetchBootstrap() {
  const response = await fetch("/api/bootstrap", {
    credentials: "include",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to load application bootstrap.");
  }

  const payload = (await response.json()) as AppBootstrapPayload;
  bootstrapCache = payload;
  return payload;
}

export function clearAppBootstrapCache() {
  bootstrapCache = null;
  bootstrapPromise = null;
}

export async function loadAppBootstrap(options?: { force?: boolean }) {
  if (options?.force) {
    clearAppBootstrapCache();
  }

  if (bootstrapCache) {
    return bootstrapCache;
  }

  if (!bootstrapPromise) {
    bootstrapPromise = fetchBootstrap().finally(() => {
      bootstrapPromise = null;
    });
  }

  return bootstrapPromise;
}
