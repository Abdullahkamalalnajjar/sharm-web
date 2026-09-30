import { create } from 'zustand';

import type { StoreType } from '@/types';

// ---------- Customer browsing filters ----------

export type DeliverySelection = { kind: 'address'; addressId: number } | { kind: 'area'; name: string };

interface BrowseState {
  /** What the customer picked explicitly. null = use the default address. */
  selection: DeliverySelection | null;
  storeType: StoreType | null;
  openOnly: boolean;
  search: string;
  setSelection: (s: DeliverySelection | null) => void;
  setStoreType: (t: StoreType | null) => void;
  setOpenOnly: (v: boolean) => void;
  setSearch: (v: string) => void;
}

export const useBrowse = create<BrowseState>((set) => ({
  selection: null,
  storeType: null,
  openOnly: false,
  search: '',
  setSelection: (selection) => set({ selection }),
  setStoreType: (storeType) => set({ storeType }),
  setOpenOnly: (openOnly) => set({ openOnly }),
  setSearch: (search) => set({ search }),
}));

// ---------- Toasts ----------

export interface Toast {
  id: number;
  message: string;
  isError: boolean;
  action?: { label: string; onClick: () => void };
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, opts?: { isError?: boolean; action?: Toast['action'] }) => void;
  dismiss: (id: number) => void;
}

let nextToastId = 1;

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  show(message, opts) {
    const id = nextToastId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, isError: opts?.isError ?? false, action: opts?.action }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), opts?.action ? 6000 : 3500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const showMessage = (message: string, isError = false) => useToasts.getState().show(message, { isError });

// ---------- Confirm dialog ----------

interface ConfirmRequest {
  message: string;
  confirmLabel: string;
  resolve: (ok: boolean) => void;
}

interface ConfirmState {
  current: ConfirmRequest | null;
  ask: (message: string, confirmLabel?: string) => Promise<boolean>;
  answer: (ok: boolean) => void;
}

export const useConfirm = create<ConfirmState>((set, get) => ({
  current: null,
  ask: (message, confirmLabel = 'تأكيد') =>
    new Promise<boolean>((resolve) => set({ current: { message, confirmLabel, resolve } })),
  answer(ok) {
    get().current?.resolve(ok);
    set({ current: null });
  },
}));

export const confirm = (message: string, confirmLabel?: string) => useConfirm.getState().ask(message, confirmLabel);

// ---------- Login prompt (guest tried an account action) ----------

interface LoginPromptState {
  reason: string | null;
  open: (reason: string) => void;
  close: () => void;
}

export const useLoginPrompt = create<LoginPromptState>((set) => ({
  reason: null,
  open: (reason) => set({ reason }),
  close: () => set({ reason: null }),
}));
