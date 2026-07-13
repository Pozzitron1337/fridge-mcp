#!/usr/bin/env node
import type { Request, Response } from "express";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { createFridgeServer } from "./server.js";

function useHttp(): boolean {
  if (process.argv.includes("--stdio")) return false;
  if (process.argv.includes("--http")) return true;
  if (process.env.MCP_TRANSPORT === "stdio") return false;
  if (process.env.MCP_TRANSPORT === "http") return true;
  // Render (and most PaaS) set PORT — prefer HTTP there
  return Boolean(process.env.PORT);
}

async function startStdio(): Promise<void> {
  const server = createFridgeServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function startHttp(): Promise<void> {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? "0.0.0.0";
  const app = createMcpExpressApp({ host });

  app.get("/", (_req: Request, res: Response) => {
    res.json({
      name: "fridge-mcp",
      status: "ok",
      mcp: "/mcp",
      transport: "streamable-http",
    });
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).send("ok");
  });

  app.post("/mcp", async (req: Request, res: Response) => {
    const server = createFridgeServer();
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on("close", () => {
        void transport.close();
        void server.close();
      });
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  app.get("/mcp", (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed. Use POST." },
      id: null,
    });
  });

  app.delete("/mcp", (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    });
  });

  app.listen(port, host, () => {
    console.log(`fridge-mcp HTTP listening on http://${host}:${port}`);
    console.log(`MCP endpoint: POST /mcp`);
  });
}

async function main(): Promise<void> {
  if (useHttp()) {
    await startHttp();
  } else {
    await startStdio();
  }
}

main().catch((error) => {
  console.error("fridge-mcp failed:", error);
  process.exit(1);
});
