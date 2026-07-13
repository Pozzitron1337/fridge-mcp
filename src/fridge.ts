import {
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type FridgeItem = {
  name: string;
  quantity: number;
  unit: string;
  expiresAt?: string;
  location?: string;
};

export type FridgeState = {
  updatedAt: string;
  items: FridgeItem[];
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_PATH = join(__dirname, "..", "data", "fridge.json");

function dataPath(): string {
  return process.env.FRIDGE_DATA_PATH ?? DEFAULT_DATA_PATH;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function loadFridge(): FridgeState {
  const path = dataPath();
  if (!existsSync(path)) {
    const empty: FridgeState = { updatedAt: new Date().toISOString(), items: [] };
    saveFridge(empty);
    return empty;
  }
  return JSON.parse(readFileSync(path, "utf8")) as FridgeState;
}

export function saveFridge(state: FridgeState): void {
  const path = dataPath();
  mkdirSync(dirname(path), { recursive: true });
  state.updatedAt = new Date().toISOString();
  const payload = JSON.stringify(state, null, 2) + "\n";
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, payload, "utf8");
  renameSync(tmp, path);
}

export function formatItem(item: FridgeItem): string {
  const parts = [`${item.name}: ${item.quantity} ${item.unit}`];
  if (item.location) parts.push(`место: ${item.location}`);
  if (item.expiresAt) parts.push(`срок до: ${item.expiresAt}`);
  return parts.join(" · ");
}

export function formatFridge(state: FridgeState): string {
  if (state.items.length === 0) {
    return "Холодильник пуст.";
  }

  const today = new Date().toISOString().slice(0, 10);
  const lines = state.items
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "ru"))
    .map((item) => {
      const expired = item.expiresAt && item.expiresAt < today;
      return `- ${formatItem(item)}${expired ? " ⚠ просрочено" : ""}`;
    });

  return [
    `В холодильнике ${state.items.length} позиций (обновлено ${state.updatedAt}):`,
    ...lines,
  ].join("\n");
}

export function findItem(state: FridgeState, name: string): FridgeItem | undefined {
  const key = normalizeName(name);
  return state.items.find((item) => normalizeName(item.name) === key);
}

export function addItem(
  state: FridgeState,
  input: {
    name: string;
    quantity: number;
    unit?: string;
    expiresAt?: string;
    location?: string;
  },
): FridgeItem {
  const existing = findItem(state, input.name);
  if (existing) {
    existing.quantity += input.quantity;
    if (input.unit) existing.unit = input.unit;
    if (input.expiresAt) existing.expiresAt = input.expiresAt;
    if (input.location) existing.location = input.location;
    saveFridge(state);
    return existing;
  }

  const item: FridgeItem = {
    name: input.name.trim(),
    quantity: input.quantity,
    unit: input.unit ?? "шт",
    expiresAt: input.expiresAt,
    location: input.location,
  };
  state.items.push(item);
  saveFridge(state);
  return item;
}

export function removeItem(
  state: FridgeState,
  name: string,
  quantity?: number,
): { ok: true; item?: FridgeItem; removed: number } | { ok: false; error: string } {
  const existing = findItem(state, name);
  if (!existing) {
    return { ok: false, error: `«${name}» в холодильнике нет.` };
  }

  const amount = quantity ?? existing.quantity;
  if (amount <= 0) {
    return { ok: false, error: "Количество должно быть больше 0." };
  }

  if (amount >= existing.quantity) {
    const removed = existing.quantity;
    state.items = state.items.filter((item) => item !== existing);
    saveFridge(state);
    return { ok: true, removed };
  }

  existing.quantity -= amount;
  saveFridge(state);
  return { ok: true, item: existing, removed: amount };
}

export function expiringSoon(state: FridgeState, withinDays = 3): FridgeItem[] {
  const now = new Date();
  const limit = new Date(now);
  limit.setDate(limit.getDate() + withinDays);
  const limitStr = limit.toISOString().slice(0, 10);

  return state.items
    .filter((item) => item.expiresAt && item.expiresAt <= limitStr)
    .sort((a, b) => (a.expiresAt ?? "").localeCompare(b.expiresAt ?? ""));
}
