import { Ascension } from "./parser";

export class Counter {
  private base: Map<string, number>;

  constructor(base?: Map<string, number>) {
    if (base) this.base = new Map(base);
    else this.base = new Map<string, number>();
  }

  increment(key: string, by = 1): void {
    this.base.set(key, (this.base.get(key) ?? 0) + by);
  }

  diff(from: Counter): Counter {
    const result = new Counter(this.base);
    for (const entry of from.base.entries()) {
      result.increment(entry[0], -1 * entry[1]);
    }
    return result;
  }

  get(key: string): number {
    return this.base.get(key) ?? 0;
  }

  /**
   * @returns The counted entries, sorted in decreasing order.
   */
  entries(): [string, number][] {
    return [...this.base.entries()].sort((a, b) => a[1] - b[1]);
  }

  static average(...counters: Counter[]): Counter {
    const result = new Counter();
    for (const counter of counters) {
      for (const entry of counter.base.entries()) {
        result.increment(entry[0], entry[1]);
      }
    }
    for (const key of result.base.keys()) {
      result.base.set(key, (result.base.get(key) ?? 0) / counters.length);
    }
    return result;
  }
}

export class AscensionSummary {
  private raw: Ascension;

  turns_spent = new Counter();
  attempts = new Counter();

  constructor(ascension: Ascension) {
    this.raw = ascension;

    for (const turn of ascension.turns) {
      const location = normalizeLocationName(turn.location);

      this.attempts.increment(location);
      if (!turn.free) this.turns_spent.increment(location);
    }
  }
}

function normalizeLocationName(location: string): string {
  const prefixes = ["Cook", "The Hedge Maze", "The Typical Tavern Cellar", "The Lower Chambers"];
  for (const prefix of prefixes) {
    if (location.startsWith(prefix)) return prefix;
  }
  return location;
}
