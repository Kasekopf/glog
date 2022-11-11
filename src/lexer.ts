export interface Token {
  raw: string;
}

class RawToken implements Token {
  constructor(readonly raw: string) {}
}

export class Unknown extends RawToken {}

interface TokenMatcher<T extends Token> {
  match(line: string): T | undefined;
}

class RawMatcher<T extends RawToken> {
  private raw: string;
  private token: new (...args: string[]) => T;

  constructor(raw: string, token: new (...args: string[]) => T) {
    this.raw = raw;
    this.token = token;
  }

  match(line: string): T | undefined {
    if (line === this.raw) return new this.token(line);
    return undefined;
  }
}

class PrefixMatcher<T extends RawToken> {
  private raw: string;
  private token: new (...args: string[]) => T;

  constructor(raw: string, token: new (...args: string[]) => T) {
    this.raw = raw;
    this.token = token;
  }

  match(line: string): T | undefined {
    if (line.startsWith(this.raw)) return new this.token(line);
    return undefined;
  }
}

class RegexMatcher<T extends Token> {
  private regex: RegExp;
  private token: new (...args: string[]) => T;

  constructor(regex: RegExp, token: new (...args: string[]) => T) {
    this.regex = regex;
    this.token = token;
  }

  match(line: string): T | undefined {
    const match = line.match(this.regex);
    if (match === null) return undefined;
    return new this.token(...match);
  }
}

class Lexer {
  matchers: { [start: string]: TokenMatcher<Token>[] } = {};

  add(matcher: TokenMatcher<Token>, start: string) {
    if (!(start in this.matchers)) this.matchers[start] = [];
    this.matchers[start].push(matcher);
  }

  addRegex<T extends Token>(start: string, regex: RegExp, token: new (...args: string[]) => T) {
    this.add(new RegexMatcher(regex, token), start);
  }

  addRaw<T extends RawToken>(raw: string, token: new (...args: string[]) => T) {
    this.add(new PrefixMatcher(raw, token), raw.charAt(0));
  }

  addPrefix<T extends RawToken>(raw: string, token: new (...args: string[]) => T) {
    this.add(new RawMatcher(raw, token), raw.charAt(0));
  }

  match(line: string): Token {
    const matchers = this.matchers[line.charAt(0)];
    if (!matchers) return new Unknown(line);

    // Unrolling this loop gives a 2x speedup on my machine
    // Must be unrolled to the maximum number of possible lexings for a given line start
    let result = matchers[0]?.match(line);
    if (result) return result;
    result = matchers[1]?.match(line);
    if (result) return result;

    // // Rolled version:
    // for (const matcher of matchers) {
    //   const result = matcher.match(line);
    //   if (result) return result;
    // }
    return new Unknown(line);
  }
}
const LEXER = new Lexer();

export function tokenize(log: string): Token[] {
  return log
    .split("\n")
    .filter((line) => line.length > 1)
    .map((line) => LEXER.match(line));
}

/**
 * The remainder of this file is a list of parsing rules for a type of line.
 *
 * Each constructor should accept a number of string arguments equal (or smaller)
 * than the number of regex groups.
 */

export class CLIText extends RawToken {}
LEXER.addPrefix(">", CLIText); // Only CLI output we want to parse should be above this

export class KingFreed extends RawToken {}
LEXER.addRaw("Preference kingLiberated changed from false to true", KingFreed);

export class Preference implements Token {
  constructor(
    readonly raw: string,
    readonly id: string,
    readonly from: string,
    readonly to: string
  ) {}
}
LEXER.addRegex("P", /^Preference ([^ ]*) changed from (.*?) to (.*)/, Preference);

export class TurnHeader implements Token {
  readonly turn: number;
  constructor(readonly raw: string, turn: string, readonly location: string) {
    this.turn = parseInt(turn);
  }
}
LEXER.addRegex("[", /^\[(\d+)\] (.*)/, TurnHeader);

export class Encounter implements Token {
  constructor(readonly raw: string, readonly monster: string) {}
}
LEXER.addRegex("E", /^Encounter: (.*)/, Encounter);

export class AscensionStart extends RawToken {}
LEXER.addRaw("\t   Beginning New Ascension", AscensionStart);

export class AscensionSeparator extends RawToken {}
LEXER.addRaw("=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=", AscensionSeparator);

export class AscensionID implements Token {
  readonly id: number;
  constructor(readonly raw: string, id: string) {
    this.id = parseInt(id);
  }
}
LEXER.addRegex("A", /^Ascension #(\d+):/, AscensionID);
