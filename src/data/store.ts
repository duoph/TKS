"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { todayKey } from "@/lib/format";
import { buildDemoData } from "./seed/generate";
import { seedSettings } from "./seed/people";
import type { DemoData, User } from "./types";

export interface StoreState extends DemoData {
  /** True once localStorage has been read. Screens show skeletons until then. */
  hydrated: boolean;
  /** Day the dummy history was generated for (YYYY-MM-DD). */
  seededOn: string;
  session: User | null;
}

const emptyData: DemoData = {
  categories: [],
  products: [],
  customers: [],
  suppliers: [],
  users: [],
  sales: [],
  purchases: [],
  batches: [],
  adjustments: [],
  customerPayments: [],
  supplierPayments: [],
  orders: [],
  heldBills: [],
  settings: seedSettings,
  counters: { bill: 0, purchase: 0, batch: 0, order: 0 },
};

/**
 * The single in-browser "database". Components read it with `useStore(selector)`
 * and change it only through the functions in `api.ts`.
 */
export const useStore = create<StoreState>()(
  persist(
    (): StoreState => ({
      ...emptyData,
      hydrated: false,
      seededOn: "",
      session: null,
    }),
    {
      name: "tks-chicken-erp",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => {
        const saved: Partial<StoreState> = { ...state };
        delete saved.hydrated;
        return saved;
      },
    },
  ),
);

let started = false;

/**
 * Loads saved state from localStorage. On first run, or when the saved history
 * is from an earlier day, fresh dummy data ending today is generated so the
 * dashboard always has "today" numbers to show.
 */
export async function initStore(): Promise<void> {
  if (started) return;
  started = true;
  try {
    await useStore.persist.rehydrate();
  } catch {
    // Corrupt or blocked storage: fall through and start from fresh demo data.
  }
  const state = useStore.getState();
  if (state.seededOn !== todayKey() || state.products.length === 0) {
    useStore.setState({ ...buildDemoData(), seededOn: todayKey() });
  }
  useStore.setState({ hydrated: true });
}

/** Replace everything with the original dummy data (keeps the signed-in user). */
export function reseed(): void {
  useStore.setState({ ...buildDemoData(), seededOn: todayKey() });
}
