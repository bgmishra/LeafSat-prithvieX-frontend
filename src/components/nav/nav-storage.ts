// Remembered sidebar state. Storage can be missing or throw (private mode,
// blocked site data), so every access falls back silently to in-memory state.

export const EXPANDED_STORAGE_KEY = "leafsat.nav.expanded";
export const COLLAPSED_STORAGE_KEY = "leafsat.nav.collapsed";

export function readExpandedState(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(EXPANDED_STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed: unknown = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        (entry): entry is [string, boolean] => typeof entry[1] === "boolean",
      ),
    );
  } catch {
    return {};
  }
}

export function writeExpandedState(state: Record<string, boolean>) {
  try {
    window.localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore: the in-memory state still works for this visit.
  }
}

export function readCollapsedState(): boolean | null {
  try {
    const raw = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
    return raw === null ? null : raw === "true";
  } catch {
    return null;
  }
}

export function writeCollapsedState(collapsed: boolean) {
  try {
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsed));
  } catch {
    // Ignore: the in-memory state still works for this visit.
  }
}
