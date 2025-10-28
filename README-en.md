# Bilibili MCP

[![English](https://img.shields.io/badge/English-Click-yellow)](README-en.md)
[![中文文档](https://img.shields.io/badge/中文文档-点击查看-orange)](README.md)
[![日本語](https://img.shields.io/badge/日本語-クリック-青)](README-ja.md)

## Introduction
This is a Bilibili video search server based on the Model Context Protocol (MCP). The server provides a simple API interface that allows users to search for video content on Bilibili. It includes LangChain usage examples and test scripts.

## Acknowledgements
- LangChain example code referenced from [mcp-langchain-ts-client](https://github.com/isaacwasserman/mcp-langchain-ts-client)

## Features
- Search Bilibili video content summary list
- Get Bilibili hot content (comprehensive hot, must-watch, rankings, music charts)
- Get Bilibili video details (supports BV or AV numbers)
- Get UP master information (basic info, follower count, following count, etc.)
- Bangumi timeline (anime broadcast information within time range)

## System Requirements
- Node.js >= 20.12.0
## AI Tool Configuration
Using Trae as an example
![](./imgs/config.png)

## npm package
Thanks to [HQHC](https://github.com/HQHC)for publishing the npm package
```json
{
  "mcpServers": {
    "bilibili-search": {
    "command": "npx",
    "args": ["bilibili-mcp-js"],
    "description": "Bilibili Video Search MCP service, enabling AI applications to search Bilibili video content."
    }
  }
}
```
## Local Compilation Usage
>Compilation is required before use.
First run npm run build, then change this to your built dist folder path, "args": ["d:\\your-path\\bilibili-mcp-js\\dist\\index.js"] 
```json
{
  "mcpServers": {
    "bilibili-search": {
      "command": "node",
      "args": ["d:\\your-path\\bilibili-mcp-js\\dist\\index.js"],
      "description": "Bilibili Video Search MCP service, enabling AI applications to search Bilibili video content."
    }
  }
}
```

## Quick Start
> If you want to run the LangChain example, please configure the LLM model first by modifying the .\example.ts file.
```javascript
const llm = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0,
  openAIApiKey: "your_api_key", // Replace with your model's API key
  configuration: {
    baseURL: "https://www.api.com/v1", // Replace with your model's API address
  },
});

bun:

```bash
# Install dependencies
bun i
# stdio mode
bun index.ts
# streamable http mode
TRANSPORT=remote bun index.ts
TRANSPORT=remote PORT=8888 bun index.ts
# Test script
bun test.js
# MCP Inspector
bun run inspector
# Run LangChain example
bun build:bun
bun example.ts
```

npm:

```bash
# Install dependencies
npm i
# stdio mode
npm run start
# streamable http mode
TRANSPORT=remote npm run start
TRANSPORT=remote PORT=8888 npm run start
# Test script
npm run test
# MCP Inspector
npm run inspector
# Run LangChain example
npm run build
node dist/example.js
```

## SCREENSHOTS
![](./imgs/test-01.png)
![](./imgs/test-02.png)
