"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
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
  const [people, setPeople] = useState<Person[]>([]);
  const [teams, setTeams] = useState<CompanyTeam[]>([]);
  const [isReady, setIsReady] = useState(false);

  const refresh = async () => {
    const payload = await fetchDirectory();
    setPeople(payload.people);
    setTeams(payload.teams);
  };

  useEffect(() => {
    let isMounted = true;

    fetchDirectory()
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
