import { Args } from "grimoire-kolmafia";
import { print, printHtml, sessionLogs } from "kolmafia";
import { Ascension, Parser } from "./parser";
import { AscensionSummary, Counter } from "./summary";

export const args = Args.create(
  "glog",
  'This is a script to analyze your Grey You log. Run "glog" without quotes to summarize your most recent run within the last week.',
  {
    history: Args.number({
      help: "Number of days back to look for Grey You logs, including today.",
      default: 7,
    }),
    run: Args.number({
      help: "Look at the run that occured this many days ago, (0 meaning today, 1 meaning yesterday, etc.). If not given, look at your most recent run.",
    }),
    farming: Args.string({
      help: "Zones to exclude as part of in-ronin farming, comma-separated.",
      default: "Barf Mountain",
    }),
    hide: Args.boolean({
      help: "Hide all zones that took exactly the average amount of turns.",
      default: true,
    }),
  }
);
export function main(command?: string): void {
  Args.fill(args, command);
  if (args.help) {
    Args.showHelp(args);
    return;
  }

  if (args.run && args.run < 0) {
    print("Invalid argument for run");
  }
  if (args.history < 0) {
    print("Invalid argument for history");
  }

  const runs = new RunCache();

  const toAnalyze = args.run === undefined ? runs.getMostRecent(args.history) : runs.get(args.run);
  if (toAnalyze === undefined) {
    if (args.run === undefined) {
      print(`Unable to find any recent Grey You runs within the last ${args.history} days.`);
    } else {
      print(`Unable to find any Grey You runs ${args.run} days ago`);
    }
    return;
  }

  const farming = args.farming.split(",");

  const others = runs.getAllCompleted(args.history).filter((asc) => asc.id !== toAnalyze.id);

  const summary = new AscensionSummary(toAnalyze);
  const othersSummary = others.map((run) => new AscensionSummary(run));

  const averageRun = Counter.average(...othersSummary.map((s) => s.turns_spent));
  const turnDiff = summary.turns_spent.diff(averageRun);
  for (const [loc, diff] of turnDiff.entries()) {
    if (farming.includes(loc)) continue;
    if (args.hide && diff === 0) continue;
    printHtml(`${loc}: ${summary.turns_spent.get(loc)} (${formatDiff(diff)})`);
  }
}

function formatDiff(diff: number) {
  if (diff < 0) return `<font color='blue'>${diff.toFixed(2)}</font>`;
  else if (diff === 0) return `<font color='grey'>0</font>`;
  else return `<font color='red'>+${diff.toFixed(2)}</font>`;
}

class RunCache {
  runs: Ascension[][] = [];

  expandCache(limit: number) {
    if (this.runs.length >= limit) return;
    const logs = sessionLogs(limit);
    while (this.runs.length < limit) {
      const log = logs[this.runs.length]; // get the next log we have not parsed
      const parser = new Parser(log);
      this.runs.push(parser.parseAscensions().filter((asc) => asc.path.includes("Grey You")));
    }
  }

  /**
   * Returns all completed runs in the given timeframe.
   * @param history The number of days back to look, including today.
   */
  getAllCompleted(history: number): Ascension[] {
    this.expandCache(history);
    const result = [];
    for (let i = 0; i < history; i++) {
      result.push(...this.runs[i].filter((asc) => asc.complete));
    }
    return result;
  }

  /**
   * Returns the most recent run (not necessarily completed) in the given timeframe.
   * @param history The number of days back to look, including today.
   */
  getMostRecent(history: number): Ascension | undefined {
    this.expandCache(history);
    return this.runs.find((r) => r.length > 0)?.[0];
  }

  /**
   * Returns the first Grey You run on the given day.
   * @param day The number of days back to look, including today.
   */
  get(day: number): Ascension | undefined {
    this.expandCache(day);
    if (this.runs[day].length === 0) return undefined;
    return this.runs[day][0];
  }
}
