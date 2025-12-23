#!/usr/bin/env node

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { DatabaseConnection } from './database/connection';
import { tools, handleToolCall } from './tools';
import { userContext } from './auth/user-context';

const server = new Server(
  {
    name: 'chatlingua-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize database connection
const db = new DatabaseConnection();

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Get the resolved userId from user context
    const resolvedUserId = userContext.getUserId();
    const result = await handleToolCall(name, args || {}, db, resolvedUserId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage }),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  try {
    await db.connect();

    // Initialize user context (authenticate if credentials provided)
    await userContext.initialize(db);

    console.error('ChatLingua MCP Server starting...');

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('ChatLingua MCP Server running');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
