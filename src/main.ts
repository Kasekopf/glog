import { Args } from "grimoire-kolmafia";
import { print, sessionLogs } from "kolmafia";
import { Ascension, Parser } from "./parser";
import { AscensionSummary } from "./summary";

export const args = Args.create(
  "glog",
  'This is a script to analyze your Grey You log. Run "glog" without quotes to summarize your most recent run within the last week.',
  {}
);
export function main(command?: string): void {
  Args.fill(args, command);
  if (args.help) {
    Args.showHelp(args);
    return;
  }

  const recentRun = findRecentAscension();
  if (recentRun === undefined) {
    print("Unable to find any recent Grey You runs");
    return;
  }

  const summary = new AscensionSummary(recentRun);
  for (const entry of summary.turns_spent.entries()) {
    print(`${entry[0]} (${entry[1]})`);
  }
}

function findGyouRun(log: string): Ascension | undefined {
  const parser = new Parser(log);
  return parser.parseAscensions().find((asc) => asc.path.includes("Grey You"));
}

function findRecentAscension(): Ascension | undefined {
  const logs = sessionLogs(2);
  for (const log of logs) {
    const run = findGyouRun(log);
    if (run) return run;
  }
  return undefined;
}
