#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { getProjectInfo } from "./utils/getProjectInfo.js";
import path from "path";
import fs from "fs";  // Use regular fs for sync operations

class FrontendFinalBoss {
  private server: Server;
  private projectPath: string;

  constructor() {
    // Enhanced project path detection - ADD THIS
    this.projectPath = this.detectProjectPath();
    console.error(`🔧 Detected project path: ${this.projectPath}`);
    
    this.server = new Server({
      name: "frontend-final-boss",
      version: '0.0.1'
    }, {
      capabilities: {
        tools: {}
      }
    });
    
    console.error('🔧 Server created, setting up handlers...');
    this.setupToolHandlers();
  }

  // ADD THIS NEW METHOD
  private detectProjectPath(): string {
    // Check environment variables that editors set
    const envPaths = [
      process.env.CURSOR_PROJECT_PATH,
      process.env.VSCODE_CWD,
      process.env.PROJECT_ROOT,
      process.env.WORKSPACE_FOLDER
    ];

    for (const envPath of envPaths) {
      if (envPath && fs.existsSync(envPath)) {
        console.error(`🔍 Using project path from environment: ${envPath}`);
        return envPath;
      }
    }

    // Look for nearest package.json (walk up directory tree)
    let currentDir = process.cwd();
    while (currentDir !== path.dirname(currentDir)) {
      const packageJsonPath = path.join(currentDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        console.error(`🔍 Found package.json, using project path: ${currentDir}`);
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }

    // Fall back to current working directory
    console.error(`🔍 Using current working directory: ${process.cwd()}`);
    return process.cwd();
  }

  private setupToolHandlers() {
    console.error('🔧 Setting up tool handlers...');
    
    // Add debugging for tools/list
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.error('📋 ===== TOOLS LIST REQUEST RECEIVED =====');
      
      const tools = [
        {
          name: "hello_world",
          description: 'A simple test tool to verify MCP server is working',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name to greet',
              }
            },
            required: ['name']
          },
        },
        {
          name: 'project_info',
          description: 'Get basic information about the current frontend project',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        }
      ];

      console.error(`📤 Returning ${tools.length} tools:`);
      tools.forEach((tool, index) => {
        console.error(`   ${index + 1}. ${tool.name}: ${tool.description}`);
      });

      const response = { tools };
      console.error('📤 Full response:', JSON.stringify(response, null, 2));
      
      return response;
    });

    // Add debugging for tools/call
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      console.error('🔧 ===== TOOL CALL REQUEST RECEIVED =====');
      console.error('🔧 Request params:', JSON.stringify(request.params, null, 2));
      
      const { name, arguments: args } = request.params;
      console.error(`🔧 Tool: ${name}, Args:`, args);
      
      try {
        let result;
        
        switch (name) {
          case "hello_world":
            // ENHANCE THIS - get project name for greeting
            const projectName = this.getProjectName();
            result = {
              content: [
                {
                  type: 'text',
                  text: `Hello, ${args?.name || 'World'}! I am your frontend Tech Lead MCP 🚀\n\nCurrently analyzing project: ${projectName}`
                }
              ]
            };
            console.error('✅ hello_world result:', JSON.stringify(result, null, 2));
            return result;

          case "project_info":
            result = await getProjectInfo(this.projectPath);
            console.error('✅ project_info result:', JSON.stringify(result, null, 2));
            return result;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error('❌ Tool execution error:', error);
        const errorResult = {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
        console.error('❌ Error result:', JSON.stringify(errorResult, null, 2));
        return errorResult;
      }
    });

    console.error('✅ Tool handlers setup complete');
  }

  // ADD THIS HELPER METHOD
  private getProjectName(): string {
    try {
      const packageJsonPath = path.join(this.projectPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageJsonContent);
        return packageJson.name || path.basename(this.projectPath);
      }
    } catch (error) {
      console.error('⚠️ Error reading package.json:', error);
    }
    return path.basename(this.projectPath);
  }

  async run() {
    console.error('🚀 Starting MCP server...');
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('✅ Frontend Final Boss MCP server running on stdio');
    console.error('📡 Server ready for requests...');
    
    // Add process handlers for debugging
    process.on('SIGINT', () => {
      console.error('🛑 Received SIGINT, shutting down...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.error('🛑 Received SIGTERM, shutting down...');
      process.exit(0);
    });
  }
}

console.error('🔧 Starting Frontend Final Boss MCP Server...');
const server = new FrontendFinalBoss();

server.run().catch((error) => {
  console.error('❌ Server startup error:', error);
  process.exit(1);
});