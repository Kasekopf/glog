import { print, sessionLogs } from "kolmafia";
import { Parser } from "./parser";

export function main(): void {
  const log = sessionLogs(2)[1];
  const startTime = Date.now();
  const parser = new Parser(log);
  const endTime = Date.now();
  print(`Tokenized ${endTime - startTime}`);
  const asc = parser.parseAscension();
  print(`Turns ${asc?.turns?.length}`);
}
