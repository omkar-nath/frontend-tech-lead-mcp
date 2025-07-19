#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const getProjectInfo_js_1 = require("./utils/getProjectInfo.js");
class FrontendFinalBoss {
    server;
    projectPath;
    constructor() {
        this.projectPath = process.cwd();
        console.error(`🔧 Detected project path: ${this.projectPath}`);
        this.server = new index_js_1.Server({
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
    setupToolHandlers() {
        console.error('🔧 Setting up tool handlers...');
        // Add debugging for tools/list
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
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
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            console.error('🔧 ===== TOOL CALL REQUEST RECEIVED =====');
            console.error('🔧 Request params:', JSON.stringify(request.params, null, 2));
            const { name, arguments: args } = request.params;
            console.error(`🔧 Tool: ${name}, Args:`, args);
            try {
                let result;
                switch (name) {
                    case "hello_world":
                        result = {
                            content: [
                                {
                                    type: 'text',
                                    text: `Hello, ${args?.name || 'World'}! Frontend Final Boss MCP server 🚀`
                                }
                            ]
                        };
                        console.error('✅ hello_world result:', JSON.stringify(result, null, 2));
                        return result;
                    case "project_info":
                        result = await (0, getProjectInfo_js_1.getProjectInfo)(this.projectPath);
                        console.error('✅ project_info result:', JSON.stringify(result, null, 2));
                        return result;
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
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
    async run() {
        console.error('🚀 Starting MCP server...');
        const transport = new stdio_js_1.StdioServerTransport();
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
