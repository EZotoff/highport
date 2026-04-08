type LogLevel = 'info' | 'warn' | 'error';

function stringifyArg(arg: unknown): string {
  if (arg instanceof Error) {
    return JSON.stringify({
      name: arg.name,
      message: arg.message,
      stack: arg.stack,
    });
  }

  if (typeof arg === 'string') {
    return arg;
  }

  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function writeLog(level: LogLevel, msg: string, args: unknown[]): void {
  const line = [new Date().toISOString(), level.toUpperCase(), msg, ...args.map(stringifyArg)].join(
    ' ',
  );

  const stream = level === 'error' ? process.stderr : process.stdout;
  stream.write(`${line}\n`);
}

export const logger = {
  info: (msg: string, ...args: unknown[]) => writeLog('info', msg, args),
  warn: (msg: string, ...args: unknown[]) => writeLog('warn', msg, args),
  error: (msg: string, ...args: unknown[]) => writeLog('error', msg, args),
};
