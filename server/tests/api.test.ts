import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../src/app.js";
import { connectMongo, disconnectMongo } from "../src/config/db.js";

const app = createApp();

beforeAll(async () => {
  await connectMongo();
});

afterAll(async () => {
  await disconnectMongo();
});

describe("auth", () => {
  it("rejects creation without a token", async () => {
    const res = await request(app)
      .post("/api/assignments")
      .send({ title: "X", numQuestions: 1, totalMarks: 1, questionTypes: ["mcq"] });
    expect(res.status).toBe(401);
  });

  it("signup → me → login round-trip", async () => {
    const email = `t${Date.now()}@v.com`;
    const su = await request(app)
      .post("/api/auth/signup")
      .send({ email, password: "password123", name: "Test User" });
    expect(su.status).toBe(201);
    expect(su.body.token).toBeTruthy();

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${su.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "password123" });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
  });

  it("rejects bad login credentials with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "wrong" });
    expect(res.status).toBe(401);
  });
});

describe("assignments", () => {
  it("rejects invalid POST body with 400", async () => {
    const email = `t${Date.now()}@v.com`;
    const su = await request(app)
      .post("/api/auth/signup")
      .send({ email, password: "password123", name: "Validation User" });
    const token = su.body.token as string;

    const res = await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "", numQuestions: 0, totalMarks: 0, questionTypes: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Validation");
  });

  it("scopes list to the signed-in user", async () => {
    const userA = await request(app)
      .post("/api/auth/signup")
      .send({ email: `a${Date.now()}@v.com`, password: "password123", name: "A" });
    const userB = await request(app)
      .post("/api/auth/signup")
      .send({ email: `b${Date.now()}@v.com`, password: "password123", name: "B" });
    const tokenA = userA.body.token as string;
    const tokenB = userB.body.token as string;

    // A creates an assignment
    const made = await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "A's paper", numQuestions: 1, totalMarks: 1, questionTypes: ["mcq"] });
    expect(made.status).toBe(201);

    // B's list should NOT include A's assignment
    const bList = await request(app)
      .get("/api/assignments")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(bList.status).toBe(200);
    const titles = (bList.body.items as Array<{ title: string }>).map((i) => i.title);
    expect(titles).not.toContain("A's paper");

    // A's list should include it
    const aList = await request(app)
      .get("/api/assignments")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(aList.status).toBe(200);
    const aTitles = (aList.body.items as Array<{ title: string }>).map((i) => i.title);
    expect(aTitles).toContain("A's paper");
  });
});

// keep the test file from leaking handles
afterAll(async () => {
  // ensure all mongoose connections are closed (the disconnectMongo above
  // does this, but adding an extra safety net for Vitest's worker)
  await mongoose.connection.close().catch(() => {});
});
