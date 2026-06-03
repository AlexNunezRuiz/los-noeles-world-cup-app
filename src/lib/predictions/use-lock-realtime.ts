"use client";

import { useEffect, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyPredictionLockConfigChange,
  configRowsToRecord,
  isPredictionsLocked,
} from "@/lib/predictions/lock";

interface ConfigRow {
  key: string;
  value: string;
}

export function usePredictionLockRealtime(
  supabase: SupabaseClient,
  setIsLocked: (locked: boolean) => void
) {
  const configRef = useRef<Record<string, string>>({});

  const setLockConfigRows = (rows: ConfigRow[]) => {
    const config = configRowsToRecord(rows);
    configRef.current = config;
    setIsLocked(isPredictionsLocked(config));
  };

  useEffect(() => {
    const channel = supabase
      .channel("prediction-lock-config")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournament_config" },
        (payload) => {
          const row = payload.new as Partial<ConfigRow> | null;
          if (row?.key !== "predictions_locked" && row?.key !== "lock_datetime") return;

          const next = applyPredictionLockConfigChange(configRef.current, {
            key: row.key,
            value: row.value ?? "",
          });
          configRef.current = next;
          setIsLocked(isPredictionsLocked(next));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setIsLocked, supabase]);

  return { setLockConfigRows };
}
