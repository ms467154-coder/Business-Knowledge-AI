import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { spawn, type ChildProcess } from "child_process";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

const fastApiPort = parseInt(process.env.FASTAPI_PORT || "8000");
const fastApiBaseUrl = `http://127.0.0.1:${fastApiPort}`;
let fastApiProcess: ChildProcess | undefined;

function startFastApiService() {
  const pythonBinary = process.env.PYTHON_BINARY || "python3";
  fastApiProcess = spawn(
    pythonBinary,
    ["-m", "uvicorn", "backend.app:app", "--host", "127.0.0.1", "--port", String(fastApiPort)],
    {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    }
  );
  fastApiProcess.on("error", error => console.error("[FastAPI] failed to start", error));
  fastApiProcess.on("exit", code => console.warn(`[FastAPI] exited with code ${code ?? "unknown"}`));
}

function stopFastApiService() {
  if (fastApiProcess && !fastApiProcess.killed) fastApiProcess.kill("SIGTERM");
}

async function proxyToFastApi(request: express.Request, response: express.Response) {
  const endpoint = request.path === "/api/health" ? "/api/health" : "/api/chat";
  try {
    const upstream = await fetch(`${fastApiBaseUrl}${endpoint}`, {
      method: request.method,
      headers: { "content-type": "application/json" },
      body: request.method === "POST" ? JSON.stringify(request.body) : undefined,
    });
    response.status(upstream.status);
    const contentType = upstream.headers.get("content-type");
    if (contentType) response.setHeader("content-type", contentType);
    response.send(await upstream.text());
  } catch {
    response.status(503).json({
      detail: "The deterministic FastAPI RAG service is unavailable. Check /api/health after startup completes.",
    });
  }
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  startFastApiService();
  app.get("/api/health", proxyToFastApi);
  app.post("/api/chat", proxyToFastApi);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

process.on("SIGTERM", stopFastApiService);
process.on("SIGINT", stopFastApiService);
startServer().catch(console.error);
