/**
 * Parsed command structure
 */
export interface ParsedCommand {
  command: string;
  args: string[];
  flags: Record<string, boolean | string>;
  rawInput: string;
}

/**
 * Parse a command string into command, arguments, and flags
 * Supports:
 * - Short flags: -l, -a, -la
 * - Long flags: --long, --all
 * - Flags with values: --color=auto, --sort=size
 * - Quoted strings: "file name.txt" or 'file name.txt'
 */
export class CommandParser {
  /**
   * Parse a command input string
   */
  static parse(input: string): ParsedCommand {
    const trimmed = input.trim();
    
    if (!trimmed) {
      return {
        command: '',
        args: [],
        flags: {},
        rawInput: input
      };
    }

    const tokens = this.tokenize(trimmed);
    
    if (tokens.length === 0) {
      return {
        command: '',
        args: [],
        flags: {},
        rawInput: input
      };
    }

    const command = tokens[0];
    const args: string[] = [];
    const flags: Record<string, boolean | string> = {};

    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.startsWith('--')) {
        // Long flag
        this.parseLongFlag(token, flags);
      } else if (token.startsWith('-') && token.length > 1 && !this.isNegativeNumber(token)) {
        // Short flag(s)
        this.parseShortFlags(token, flags);
      } else {
        // Regular argument
        args.push(token);
      }
    }

    return {
      command,
      args,
      flags,
      rawInput: input
    };
  }

  /**
   * Tokenize input string, respecting quoted strings
   */
  private static tokenize(input: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuote: string | null = null;
    let escaped = false;

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"' || char === "'") {
        if (inQuote === char) {
          // End quote
          inQuote = null;
        } else if (inQuote === null) {
          // Start quote
          inQuote = char;
        } else {
          // Different quote inside quoted string
          current += char;
        }
        continue;
      }

      if (inQuote === null && (char === ' ' || char === '\t')) {
        // Whitespace outside quotes - token separator
        if (current) {
          tokens.push(current);
          current = '';
        }
        continue;
      }

      current += char;
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
  }

  /**
   * Parse a long flag (--flag or --flag=value)
   */
  private static parseLongFlag(token: string, flags: Record<string, boolean | string>): void {
    const flagName = token.substring(2);
    
    if (flagName.includes('=')) {
      const [name, value] = flagName.split('=', 2);
      flags[name] = value;
    } else {
      flags[flagName] = true;
    }
  }

  /**
   * Parse short flag(s) (-l or -la)
   */
  private static parseShortFlags(token: string, flags: Record<string, boolean | string>): void {
    const flagChars = token.substring(1);
    
    for (const char of flagChars) {
      flags[char] = true;
    }
  }

  /**
   * Check if a token is a negative number (not a flag)
   */
  private static isNegativeNumber(token: string): boolean {
    return /^-\d+(\.\d+)?$/.test(token);
  }

  /**
   * Check if a flag is present
   */
  static hasFlag(parsed: ParsedCommand, ...names: string[]): boolean {
    return names.some(name => parsed.flags[name] === true || typeof parsed.flags[name] === 'string');
  }

  /**
   * Get flag value (returns true for boolean flags, string for value flags)
   */
  static getFlagValue(parsed: ParsedCommand, name: string): boolean | string | undefined {
    return parsed.flags[name];
  }

  /**
   * Get flag value as string (returns empty string for boolean flags)
   */
  static getFlagValueAsString(parsed: ParsedCommand, name: string, defaultValue: string = ''): string {
    const value = parsed.flags[name];
    if (typeof value === 'string') {
      return value;
    }
    return defaultValue;
  }

  /**
   * Validate command against a list of valid commands
   */
  static isValidCommand(parsed: ParsedCommand, validCommands: string[]): boolean {
    return validCommands.includes(parsed.command);
  }
}
