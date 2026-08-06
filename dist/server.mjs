"use strict";
// server.mts
import { createServer } from "http";
import { Server } from "socket.io";
import next from "next";
/* --------------------------------------------------
   🛠 Setup Next.js + HTTP Server
---------------------------------------------------*/
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
app.prepare().then(() => {
    var _a;
    const httpServer = createServer((req, res) => handle(req, res));
    /* --------------------------------------------------
       ⚡ Create Socket.IO server (Singleton safe)
    ---------------------------------------------------*/
    const io = (_a = globalThis.io) !== null && _a !== void 0 ? _a : new Server(httpServer, {
        cors: { origin: "*" },
        pingInterval: 25000, // reduces zombie connections
        pingTimeout: 15000,
        maxHttpBufferSize: 1e6,
        connectionStateRecovery: {}, // allows users to reconnect safely
    });
    globalThis.io = io;
    /* --------------------------------------------------
       📌 Logging helper
    ---------------------------------------------------*/
    const log = (...msg) => console.log(`[${new Date().toISOString()}]`, ...msg);
    /* --------------------------------------------------
       🛡 Safe Emit Wrapper (prevents crash)
    ---------------------------------------------------*/
    const safeEmit = (room, event, data) => {
        try {
            io.to(room).emit(event, data);
        }
        catch (err) {
            console.error(`❌ Emit error on ${event} to ${room}:`, err);
        }
    };
    /* --------------------------------------------------
       🔥 Handle Socket Connection
    ---------------------------------------------------*/
    io.on("connection", (socket) => {
        log(`🔌 ${socket.id} connected`);
        /* --------------------------------------------------
           📍 Join Rooms
        ---------------------------------------------------*/
        socket.on("join", (room) => {
            socket.join(room);
            log(`📥 ${socket.id} joined room ${room}`);
        });
        /* --------------------------------------------------
           📍 Leave Rooms
        ---------------------------------------------------*/
        socket.on("leave", (room) => {
            socket.leave(room);
            log(`📤 ${socket.id} left room ${room}`);
        });
        /* --------------------------------------------------
           📝 Comments (new, replies)
        ---------------------------------------------------*/
        socket.on("comment:new", (payload) => {
            safeEmit(payload.room, "comment:new", payload);
        });
        /* --------------------------------------------------
           ❤️ Reactions
        ---------------------------------------------------*/
        socket.on("comment:reaction", (payload) => {
            safeEmit(payload.room, "comment:reaction", payload);
        });
        /* --------------------------------------------------
           🎵 Media Events (Song / Album / Video)
        ---------------------------------------------------*/
        const MEDIA_EVENTS = ["media:create", "media:update", "media:delete"];
        MEDIA_EVENTS.forEach((evt) => {
            socket.on(evt, (payload) => {
                var _a;
                log(`🎶 ${evt} → ${payload.type} (${((_a = payload === null || payload === void 0 ? void 0 : payload.data) === null || _a === void 0 ? void 0 : _a.title) || (payload === null || payload === void 0 ? void 0 : payload.id)})`);
                io.emit(evt, payload);
            });
        });
        /* --------------------------------------------------
           📊 Charts
        ---------------------------------------------------*/
        socket.on("charts:update:category", (payload) => {
            log(`📊 Category update: ${payload.category}`);
            io.emit("charts:update:category", payload);
        });
        socket.on("charts:update:item", (payload) => {
            log(`📈 Item update [${payload.id}] -> ${payload.newPos}`);
            io.emit("charts:update:item", payload);
        });
        /* --------------------------------------------------
           ✨ Real-time Stan Updates
        ---------------------------------------------------*/
        socket.on("stan:update", (payload) => {
            safeEmit(`artist:${payload.artistId}`, "stan:update", payload);
        });
        /* --------------------------------------------------
           ❤️ Live Notifications (Global & User-specific)
        ---------------------------------------------------*/
        socket.on("notify:global", (message) => io.emit("notify:global", { message }));
        socket.on("notify:user", (payload) => {
            safeEmit(`user:${payload.userId}`, "notify:user", payload);
        });
        /* --------------------------------------------------
           🔄 Heartbeat (keeps stale clients alive)
        ---------------------------------------------------*/
        socket.on("ping:client", () => socket.emit("ping:server"));
        /* --------------------------------------------------
           ❌ Disconnect Cleanup
        ---------------------------------------------------*/
        socket.on("disconnect", () => {
            log(`❌ ${socket.id} disconnected`);
        });
    });
    /* --------------------------------------------------
       🚀 Boot the Server
    ---------------------------------------------------*/
    httpServer.listen(3000, () => log("🚀 Server running at http://localhost:3000"));
});
