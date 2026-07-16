/**
 * Baileys master is ESM-only while this backend is currently compiled as
 * CommonJS. Native dynamic import keeps the provider isolated until the
 * application is migrated to ESM as a whole.
 */
let baileysModule: Promise<any> | undefined;
let consoleGuardInstalled = false;

/**
 * The current Baileys master dependency logs full Signal session objects when
 * it rotates a ratchet. Those objects contain private key material. Filter
 * only those known library diagnostics; application console output is kept.
 */
const installSignalConsoleGuard = (): void => {
  if (consoleGuardInstalled) return;
  consoleGuardInstalled = true;

  const originalInfo = console.info.bind(console);
  const originalWarn = console.warn.bind(console);
  const signalSessionMessages = new Set([
    "Closing session:",
    "Opening session:",
    "Session already closed"
  ]);
  const suppressSignalSessionDump = (args: unknown[]): boolean =>
    typeof args[0] === "string" && signalSessionMessages.has(args[0]);

  console.info = (...args: unknown[]) => {
    if (!suppressSignalSessionDump(args)) originalInfo(...args);
  };
  console.warn = (...args: unknown[]) => {
    if (!suppressSignalSessionDump(args)) originalWarn(...args);
  };
};

export const loadBaileys = (): Promise<any> => {
  if (!baileysModule) {
    installSignalConsoleGuard();
    // eslint-disable-next-line no-new-func
    baileysModule = new Function("specifier", "return import(specifier)")(
      "@whiskeysockets/baileys"
    );
  }
  return baileysModule;
};
