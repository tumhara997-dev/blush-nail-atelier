import { randomInt } from "node:crypto";

// No 0/O/1/I/L so references are easy to read out over the phone.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function newBookingRef(): string {
  let s = "";
  for (let i = 0; i < 5; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `BL-${s}`;
}
