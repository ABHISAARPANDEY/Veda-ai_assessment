import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import IORedis from "ioredis";
import { env } from "../config/env.js";
import {
  SocketEvents,
  type JobCompletedPayload,
  type JobFailedPayload,
  type JobProgressPayload,
  type JobStatusPayload,
} from "../types/socketEvents.js";

const BUS_CHANNEL = "veda:job-events";

// Discriminated union for the cross-process bus.
type BusMessage =
  | { type: "status"; payload: JobStatusPayload }
  | { type: "progress"; payload: JobProgressPayload }
  | { type: "completed"; payload: JobCompletedPayload }
  | { type: "failed"; payload: JobFailedPayload };

let ioInstance: Server | null = null;

export function initSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_ORIGIN, credentials: true },
  });

  io.on("connection", (socket: Socket) => {
    console.log("[socket] connected:", socket.id);
    socket.on(SocketEvents.Subscribe, (assignmentId: unknown) => {
      if (typeof assignmentId !== "string" || !assignmentId) return;
      socket.join(assignmentId);
      console.log(`[socket] ${socket.id} subscribed to room ${assignmentId}`);
    });
    socket.on("disconnect", () => {
      console.log("[socket] disconnected:", socket.id);
    });
  });

  ioInstance = io;
  return io;
}

// Bridge: API process subscribes to redis and re-emits to the right room.
export function attachBusListener(): void {
  if (!ioInstance) throw new Error("initSocketServer must be called first");
  const sub = new IORedis(env.REDIS_URL);
  sub.subscribe(BUS_CHANNEL, (err) => {
    if (err) console.error("[bus] subscribe error:", err.message);
    else console.log("[bus] subscribed to", BUS_CHANNEL);
  });
  sub.on("message", (_channel, raw) => {
    try {
      const msg = JSON.parse(raw) as BusMessage;
      switch (msg.type) {
        case "status":
          ioInstance!.to(msg.payload.assignmentId).emit(SocketEvents.JobStatus, msg.payload);
          break;
        case "progress":
          ioInstance!.to(msg.payload.assignmentId).emit(SocketEvents.JobProgress, msg.payload);
          break;
        case "completed":
          ioInstance!
            .to(msg.payload.assignmentId)
            .emit(SocketEvents.JobCompleted, msg.payload);
          break;
        case "failed":
          ioInstance!.to(msg.payload.assignmentId).emit(SocketEvents.JobFailed, msg.payload);
          break;
      }
    } catch (err) {
      console.error("[bus] bad message:", err);
    }
  });
}

// Publisher used by the worker process.
export class JobEventPublisher {
  private pub = new IORedis(env.REDIS_URL);

  private publish(msg: BusMessage) {
    return this.pub.publish(BUS_CHANNEL, JSON.stringify(msg));
  }

  status(payload: JobStatusPayload) {
    return this.publish({ type: "status", payload });
  }
  progress(payload: JobProgressPayload) {
    return this.publish({ type: "progress", payload });
  }
  completed(payload: JobCompletedPayload) {
    return this.publish({ type: "completed", payload });
  }
  failed(payload: JobFailedPayload) {
    return this.publish({ type: "failed", payload });
  }
}
