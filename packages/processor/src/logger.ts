const BLUE = '\x1b[34m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

export function info(msg: string): void {
  console.log(`${BLUE}ℹ${RESET} ${msg}`);
}

export function success(msg: string): void {
  console.log(`${GREEN}✓${RESET} ${msg}`);
}

export function warn(msg: string): void {
  console.log(`${YELLOW}⚠${RESET} ${msg}`);
}

export function error(msg: string): void {
  console.error(`${RED}✗${RESET} ${msg}`);
}

export function step(label: string, detail: string): void {
  console.log(`\n${BLUE}▶${RESET} ${label} ${DIM}${detail}${RESET}`);
}

export function stat(label: string, value: string | number): void {
  console.log(`  ${DIM}${label}:${RESET} ${value}`);
}

export function divider(): void {
  console.log(`${DIM}${'─'.repeat(60)}${RESET}`);
}
