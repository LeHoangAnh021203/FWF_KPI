"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { subscribeToPersonChannel } from "@/lib/client/realtime";
import { loadAppBootstrap } from "@/lib/client/bootstrap";
import type { Person } from "@/lib/people";

type CompanyTeam = {
  id: string;
  name: string;
  color: string;
  memberIds: string[];
};

type DirectoryContextValue = {
  people: Person[];
  teams: CompanyTeam[];
  isReady: boolean;
  refresh: () => Promise<void>;
};

const DirectoryContext = createContext<DirectoryContextValue | null>(null);

async function fetchDirectory() {
  const response = await fetch("/api/people", {
    credentials: "include",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to load directory.");
  }

  return (await response.json()) as {
    people: Person[];
    teams: CompanyTeam[];
  };
}

export function DirectoryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [teams, setTeams] = useState<CompanyTeam[]>([]);
  const [isReady, setIsReady] = useState(false);

  const refresh = async () => {
    const payload = await loadAppBootstrap({ force: true }).catch(() => fetchDirectory());
    setPeople(payload.people);
    setTeams(payload.teams);
  };

  useEffect(() => {
    let isMounted = true;

    loadAppBootstrap()
      .catch(() => fetchDirectory())
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        setPeople(payload.people);
        setTeams(payload.teams);
      })
      .finally(() => {
        if (isMounted) {
          setIsReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user?.personId) {
      return;
    }

    return subscribeToPersonChannel(user.personId, (message) => {
      const payload = message.data as { type?: string } | undefined;
      if (payload?.type !== "directory.updated") {
        return;
      }

      void refresh().catch(() => {
        // Ignore transient realtime refresh failures and keep current snapshot.
      });
    });
  }, [user?.personId]);

  const value = useMemo(
    () => ({
      people,
      teams,
      isReady,
      refresh
    }),
    [isReady, people, teams]
  );

  return <DirectoryContext.Provider value={value}>{children}</DirectoryContext.Provider>;
}

export function useDirectory() {
  const context = useContext(DirectoryContext);
  if (!context) {
    throw new Error("useDirectory must be used inside DirectoryProvider");
  }
  return context;
}
