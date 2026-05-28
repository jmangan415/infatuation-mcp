#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

const server = createServer();
const transport = new StdioServerTransport();

// SDK v1.29's StdioServerTransport doesn't react to stdin EOF/close, so the
// worker lingers after the parent (e.g. OpenClaw) closes the pipe. Exit on
// either signal so sessions don't pile up.
process.stdin.on('end', () => process.exit(0));
process.stdin.on('close', () => process.exit(0));

// Backstop for peers that wire stdio as Unix socketpairs and leak their end
// without half-closing (observed with openclaw-gateway): 'end'/'close' never
// fire, so the worker would otherwise run forever. Exit after IDLE_MS of no
// inbound stdin traffic. Disabled by default — enable via env var for clients
// that need it (e.g. INFATUATION_MCP_IDLE_MS=300000 on the Pi).
const IDLE_MS = process.env.INFATUATION_MCP_IDLE_MS
  ? Number(process.env.INFATUATION_MCP_IDLE_MS)
  : 0;
if (IDLE_MS > 0) {
  let lastActivity = Date.now();
  process.stdin.on('data', () => {
    lastActivity = Date.now();
  });
  const idleTimer = setInterval(() => {
    if (Date.now() - lastActivity > IDLE_MS) process.exit(0);
  }, 30_000);
  idleTimer.unref();
}

await server.connect(transport);
