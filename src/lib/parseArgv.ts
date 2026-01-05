export type Flags = Record<string, string | boolean>;

export type ParsedArgs = {
  command: string;
  args: string[];
  flags: Flags;
  showHelp: boolean;
  showVersion: boolean;
};

export function parseArgv(argv: string[]): ParsedArgs {
  const flags: Flags = {};
  const positionals: string[] = [];
  let showHelp = false;
  let showVersion = false;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--help' || value === '-h') {
      showHelp = true;
      continue;
    }

    if (value === '--version' || value === '-v') {
      showVersion = true;
      continue;
    }

    if (value.startsWith('--')) {
      const flagValue = value.slice(2);
      const equalsIndex = flagValue.indexOf('=');
      const name = equalsIndex === -1 ? flagValue : flagValue.substring(0, equalsIndex);

      // If = is present, use the RHS (even if empty string)
      if (equalsIndex !== -1) {
        flags[name] = flagValue.substring(equalsIndex + 1);
        continue;
      }

      // No =, so peek at next arg for value or treat as boolean
      const next = argv[index + 1];
      if (next !== undefined && !next.startsWith('-')) {
        flags[name] = next;
        index += 1;
      } else {
        flags[name] = true;
      }

      continue;
    }

    if (value.startsWith('-') && value.length > 1) {
      const name = value.slice(1);
      const next = argv[index + 1];
      if (next !== undefined && !next.startsWith('-')) {
        flags[name] = next;
        index += 1;
      } else {
        flags[name] = true;
      }
      continue;
    }

    positionals.push(value);
  }

  if (flags.t !== undefined && flags.threshold === undefined) {
    flags.threshold = flags.t;
    delete flags.t;
  }

  if (flags.T !== undefined && flags.total === undefined) {
    flags.total = flags.T;
    delete flags.T;
  }

  // Short alias: -E → --debug-echo
  if (flags.E !== undefined && flags['debug-echo'] === undefined) {
    flags['debug-echo'] = flags.E;
    delete flags.E;
  }

  return {
    command: positionals[0] ?? 'intro',
    args: positionals.slice(1),
    flags,
    showHelp,
    showVersion
  };
}

export function toBool(value: string | boolean | undefined): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(v)) return true;
    if (['0', 'false', 'no', 'off'].includes(v)) return false;
  }
  return false;
}
