// Business clock. Real time by default; the simulator can shift it (e.g. to 2 pm Pacific)
// so time-of-day rules like receiving cutoffs behave the same whenever the demo runs.

let offsetMs = 0;

export function clockNow(): Date {
  return new Date(Date.now() + offsetMs);
}

/** Make clockNow() read `at` right now and keep ticking from there; null restores real time. */
export function setClock(at: Date | null): void {
  offsetMs = at ? at.getTime() - Date.now() : 0;
}
