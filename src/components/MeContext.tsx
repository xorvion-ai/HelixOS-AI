"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Me } from "@/lib/types";
import { api } from "@/lib/api";

// Signed-in user + workspace status (from /api/me). Powers the profile, the
// admin-nav gate, and the onboarding redirect. In demo mode the backend
// returns the public demo user (is_admin + onboarded), so nothing gates off.

interface MeCtx {
  me: Me | null;
  loading: boolean;
  setOnboarded: (v: boolean) => void;
  refresh: () => void;
}

const Ctx = createContext<MeCtx | null>(null);

export function useMe(): MeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMe must be used within <MeProvider>");
  return v;
}

export function MeProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  function refresh() {
    api.me().then(setMe).catch(() => setMe(null)).finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, []);

  function setOnboarded(v: boolean) {
    setMe((m) => (m ? { ...m, onboarded: v } : m));
  }

  return <Ctx.Provider value={{ me, loading, setOnboarded, refresh }}>{children}</Ctx.Provider>;
}
