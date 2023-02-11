import { Args } from "grimoire-kolmafia";
import { fileToBuffer, getRevision, print, printHtml, sessionLogs } from "kolmafia";
import { Ascension, Parser, ScriptStatus } from "./parser";
import { AscensionSummary, Counter } from "./summary";
import { lastCommitHash } from "./_git_commit";
import { $location } from "libram";

export const args = Args.create(
  "glog",
  'This is a script to analyze your Grey You log. Run "glog" without quotes to summarize your most recent run within the last week.',
  {
    version: Args.flag({ help: "Show script version and exit.", setting: "" }),
    history: Args.number({
      help: "Number of days back to look for Grey You logs, including today.",
      default: 7,
    }),
    run: Args.string({
      help: "If this is a number, look at the run that occured this many days ago, (0 meaning today, 1 meaning yesterday, etc.). If this is a file in your data folder, parse it for a log. If not given, look at your most recent run.",
    }),
    farming: Args.locations({
      help: "Zones to exclude as part of in-ronin farming, comma-separated.",
      default: [$location`Barf Mountain`],
    }),
    cutoff: Args.number({
      help: "Only display diffs which are larger in magnitude than this number.",
    }),
  }
);
export function main(command?: string): void {
  Args.fill(args, command);
  if (args.help) {
    Args.showHelp(args);
    return;
  }

  if (args.version) {
    print(
      `Running glog version [${lastCommitHash ?? "custom-built"}] in KoLmafia r${getRevision()}`
    );
  }

  if (args.history < 0) {
    print("Invalid argument for history");
  }

  const runs = new RunCache();

  const toAnalyze = getRunToAnalyze(runs);
  if (!toAnalyze) return;

  const farming = args.farming.map((loc) => `${loc}`);

  const others = runs.getAllCompleted(args.history).filter((asc) => asc.id !== toAnalyze.id);

  const summary = new AscensionSummary(toAnalyze);
  const othersSummary = others.map((run) => new AscensionSummary(run));

  const averageRun = Counter.average(...othersSummary.map((s) => s.turns_spent));
  const turnDiff = summary.turns_spent.diff(averageRun);
  let nonFarmingSum = 0;
  if (othersSummary.length > 0)
    printHtml(`Summary of Grey You run (vs. average of last ${othersSummary.length} runs):`);
  else printHtml(`Summary of Grey You run:`);
  let displayedCutoff = false;
  for (const [loc, diff] of turnDiff.entries()) {
    if (farming.includes(loc)) continue;
    nonFarmingSum += summary.turns_spent.get(loc);
    if (args.cutoff !== undefined && Math.abs(diff) <= args.cutoff) {
      if (!displayedCutoff) {
        if (args.cutoff === 0)
          printHtml(
            `&nbsp;&nbsp;&nbsp;<font color='#888888'>- removing entries with no change from average -</font>`
          );
        else
          printHtml(
            `&nbsp;&nbsp;&nbsp;<font color='#888888'>- removing entries with change &lt;= ${args.cutoff} from average -</font>`
          );
      }
      displayedCutoff = true;
      continue;
    }
    if (othersSummary.length > 0)
      printHtml(
        `&nbsp;&nbsp;&nbsp;${loc}: <b>${summary.turns_spent.get(loc)} ${formatDiff(diff)}</b>`
      );
    else printHtml(`&nbsp;&nbsp;&nbsp;${loc}: <b>${summary.turns_spent.get(loc)}</b>`);
  }
  printHtml(``);
  printHtml(`Total turns spent as Grey You: <b>${summary.turns_spent.sum()}</b>`);
  printHtml(`&nbsp;&nbsp;&nbsp;Non-farming turns: <b>${nonFarmingSum}</b>`);
  if (toAnalyze.scriptStatus.length > 0) {
    const status = toAnalyze.scriptStatus[0];

    const otherStatus = othersSummary
      .map((sum) => sum.scriptStatus())
      .filter((status) => status !== undefined) as ScriptStatus[];
    const otherUsed =
      otherStatus.length > 0
        ? status.used - otherStatus.reduce((a, b) => a + b.used, 0) / otherStatus.length
        : undefined;
    const otherRemaining =
      otherStatus.length > 0
        ? status.remaining - otherStatus.reduce((a, b) => a + b.remaining, 0) / otherStatus.length
        : undefined;
    printHtml(
      `&nbsp;&nbsp;&nbsp;Adventures used at halt: <b>${status.used} ${formatDiff(otherUsed)}</b>`
    );
    printHtml(
      `&nbsp;&nbsp;&nbsp;Adventures remaining at halt: <b>${status.remaining} ${formatDiff(
        otherRemaining
      )}</b>`
    );
  }
}

function formatDiff(diff: number | undefined) {
  if (diff === undefined) return "";
  if (diff < 0) return `(<font color='blue'>${diff.toFixed(2)}</font>)`;
  else if (diff === 0) return `(<font color='grey'>0</font>)`;
  else return `(<font color='red'>+${diff.toFixed(2)}</font>)`;
}

function getRunToAnalyze(runs: RunCache): Ascension | undefined {
  if (!args.run) {
    const result = runs.getMostRecent(args.history);
    if (!result)
      print(`Unable to find any recent Grey You runs within the last ${args.history} days.`, "red");
    return result;
  }

  // If args.run is a number, load that run from the cache
  const runNumber = Number(args.run);
  if (!isNaN(runNumber) && runNumber >= 0) {
    const result = runs.get(runNumber);
    if (!result) print(`Unable to find any Grey You runs ${args.run} days ago`, "red");
    return result;
  }

  // If args.run is a file in the data folder, try to parse it as a log
  const runFileContents = fileToBuffer(args.run);
  if (runFileContents.length > 0) {
    const results = Parser.findGreyYouRuns(runFileContents);
    if (results.length === 0) {
      print(`Unable to find any Grey You runs in data/${args.run}`, "red");
      return undefined;
    }
    if (results.length > 1) {
      print(`Found ${results.length} runs in data/${args.run}; analyzing the first run`);
    }
    return results[0];
  }

  print(`Unable to understand run=${args.run}`);
  return undefined;
}

class RunCache {
  runs: Ascension[][] = [];

  expandCache(limit: number) {
    if (this.runs.length >= limit) return;
    const logs = sessionLogs(limit);
    while (this.runs.length < limit) {
      const log = logs[this.runs.length]; // get the next log we have not parsed
      this.runs.push(Parser.findGreyYouRuns(log));
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
    this.expandCache(day + 1);
    if (this.runs[day].length === 0) return undefined;
    return this.runs[day][0];
  }
}
