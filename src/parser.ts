import {
  AscensionID,
  AscensionSeparator,
  AscensionStart,
  CLIText,
  Encounter,
  KingFreed,
  Preference,
  Token,
  tokenize,
  TurnHeader,
  Unknown,
} from "./lexer";

type ClassOf<T> = new (...args: string[]) => T;

interface AscensionHeader {
  id: number;
  path: string;
  moonsign: string;
}

export interface Ascension extends AscensionHeader {
  turns: Turn[];
  complete: boolean;
}

export interface Turn {
  location: string;
  turn: number;
  prefs: Preference[];
  encs: Encounter[];
  free: boolean;
}

export class Parser {
  lines: Token[];
  private index: number;

  constructor(log: string) {
    this.lines = tokenize(log);
    this.index = 0;
  }

  finished(): boolean {
    return this.index >= this.lines.length;
  }

  /**
   * Return the next token to be parsed.
   *
   * If a token class is given, return the next token that occurs of that
   * class, or undefined if none exist.
   */
  private peek(): Token;
  private peek<T extends Token>(target: ClassOf<T>): T | undefined;
  private peek<T extends Token>(target?: ClassOf<T>): T | undefined {
    if (this.index >= this.lines.length) throw `Cannot peek EOF`;
    if (!target) return this.lines[this.index] as T;

    for (let j = this.index; j < this.lines.length; j++) {
      const which = this.lines[j];
      if (which instanceof target) return which;
    }
    return undefined;
  }

  private consumeNext<T>(target: ClassOf<T>): T | undefined {
    for (; this.index < this.lines.length; this.index++) {
      const next = this.lines[this.index];
      if (next instanceof target) {
        this.index++;
        return next;
      }
    }
    return undefined;
  }

  private consume(): Token;
  private consume<T extends Token>(target: ClassOf<T>): T;
  private consume<T extends Token>(target?: ClassOf<T>): T {
    if (this.index >= this.lines.length) throw `Cannot consume EOF`;

    const next = this.lines[this.index];
    this.index++;
    if (!target) return next as T;
    if (this.index >= this.lines.length) throw `Expected ${target.name} but reached EOF`;
    if (!(next instanceof target))
      throw `Expected ${target.name} but log contained: ${next.constructor.name}`;
    return next;
  }

  parseAscensionHeader(): AscensionHeader | undefined {
    this.consumeNext(AscensionStart);
    if (this.finished()) return undefined;
    this.consume(AscensionSeparator);
    const result = {
      id: this.consume(AscensionID).id,
      path: this.consume().raw,
      moonsign: this.consume().raw,
    };
    this.consumeNext(AscensionSeparator);
    return result;
  }

  parseTurn(): Turn {
    const header = this.consumeNext(TurnHeader);
    if (header === undefined) throw `Unable to parse next adventure`;
    const result: Turn = {
      location: header.location,
      turn: header.turn,
      free: this.peek(TurnHeader)?.turn === header.turn,
      prefs: [],
      encs: [],
    };

    while (!this.finished()) {
      const next = this.peek();
      if (next instanceof Preference) result.prefs.push(next);
      else if (next instanceof Encounter) result.encs.push(next);
      else if (!(next instanceof Unknown) && !(next instanceof CLIText)) break;
      this.consume();
    }
    return result;
  }

  parseAscension(): Ascension | undefined {
    const header = this.parseAscensionHeader();
    if (!header) return undefined;

    const turns: Turn[] = [];
    while (!this.finished()) {
      const next = this.peek();
      if (next instanceof TurnHeader) turns.push(this.parseTurn());
      else if (next instanceof AscensionStart) break;
      else if (next instanceof KingFreed) break;
      else this.consume();
    }
    return {
      ...header,
      turns: turns,
      complete: !this.finished(),
    };
  }

  parseAscensions(): Ascension[] {
    const result: Ascension[] = [];
    while (!this.finished()) {
      const nextAscension = this.parseAscension();
      if (!nextAscension) break;
      result.push(nextAscension);
    }
    return result;
  }
}
