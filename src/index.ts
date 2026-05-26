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

await server.connect(transport);
