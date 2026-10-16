// server.mts
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import next from "next";

/* --------------------------------------------------
   🧠 Global Socket.IO Instance (prevents duplicates)
---------------------------------------------------*/
declare global {
  var io: Server | undefined;
}

/* --------------------------------------------------
   🛠 Setup Next.js + HTTP Server
---------------------------------------------------*/
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
  const configuredOrigins =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_BASE_URL;

  if (!dev && !configuredOrigins) {
    throw new Error(
      "Set NEXT_PUBLIC_APP_URL, NEXTAUTH_URL, or NEXT_PUBLIC_BASE_URL before starting production."
    );
  }

  const socketOrigins = (configuredOrigins || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      try {
        return new URL(origin).origin;
      } catch {
        throw new Error(`Invalid Socket.IO origin: ${origin}`);
      }
    });

  const isPublicRoom = (room: string) =>
    /^[a-f\d]{24}$/i.test(room) ||
    /^(Song|Album|Video|Beat):[a-f\d]{24}$/i.test(room) ||
    /^artist:[a-f\d]{24}$/i.test(room);

  app.prepare().then(() => {
    const httpServer = createServer((req, res) => handle(req, res));

    const io =
      globalThis.io ??
      new Server(httpServer, {
      cors: { origin: socketOrigins },
      pingInterval: 25000, // reduces zombie connections
      pingTimeout: 15000,
      maxHttpBufferSize: 1e6,
      connectionStateRecovery: {}, // allows users to reconnect safely
    });

    globalThis.io = io;

    io.on("connection", (socket: Socket) => {
      socket.on("join", (room: unknown) => {
        if (typeof room !== "string" || room.length > 100 || !isPublicRoom(room)) {
          console.warn(`[SOCKET] Rejected invalid room join from ${socket.id}`);
          return;
        }
        socket.join(room);
      });

      socket.on("leave", (room: unknown) => {
        if (typeof room === "string" && room.length <= 100 && isPublicRoom(room)) {
          socket.leave(room);
        }
      });

      socket.on("ping:client", () => socket.emit("ping:server"));

      socket.on("disconnect", () => {
        console.log(`[SOCKET] ${socket.id} disconnected`);
      });
    });

    const port = Number(process.env.PORT) || 3000;
    httpServer.listen(port, () =>
      console.log(`[SERVER] Listening on port ${port}`)
    );
  }).catch((error: unknown) => {
    console.error("[SERVER] Failed to start:", error);
    process.exitCode = 1;
});
