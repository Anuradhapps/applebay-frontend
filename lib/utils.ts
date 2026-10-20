import type { Student } from "./types";

type Named = Pick<Student, "firstName" | "lastName">;

export function fullName(person?: Named): string {
  return person ? `${person.firstName} ${person.lastName}` : "—";
}

/** Today as YYYY-MM-DD in the user's local time ("en-CA" formats dates that way). */
export function today(): string {
  return new Date().toLocaleDateString("en-CA");
}

/** Empty strings become null so the backend doesn't reject "" for dates etc. */
export function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function matches(term: string, ...fields: (string | undefined | null)[]) {
  const t = term.trim().toLowerCase();
  return !t || fields.some((f) => (f ?? "").toLowerCase().includes(t));
}
