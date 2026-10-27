export const STATUSES = [
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export type Status = (typeof STATUSES)[number];

/**
 * Forward order for the active pipeline. Rejected and withdrawn are terminal,
 * so their values are never compared.
 */
const ORDER: Record<Status, number> = {
  applied: 0,
  interviewing: 1,
  offer: 2,
  rejected: -1,
  withdrawn: -1,
};

const TERMINAL: ReadonlySet<Status> = new Set(["rejected", "withdrawn"]);

/**
 * Allowed moves: forward along applied -> interviewing -> offer, or to
 * rejected/withdrawn from any active state. Terminal states never change.
 * No backward moves and no same-state updates.
 */
export function canTransition(from: Status, to: Status): boolean {
  if (from === to || TERMINAL.has(from)) {
    return false;
  }
  if (to === "rejected" || to === "withdrawn") {
    return true;
  }
  return ORDER[to] > ORDER[from];
}
