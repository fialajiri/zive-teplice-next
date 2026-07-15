// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { connectToDatabase } from "../connection";
import { createEventRepository } from "./event.repository";
import { EventModel } from "../models/event.model";
import { UserModel } from "../models/user.model";

// Transactions require a replica set — a standalone mongod rejects them with
// "Transaction numbers are only allowed on a replica set member or mongos"
// (plan gotcha #6). MongoMemoryReplSet gives us a single-member replica set.
let mem: MongoMemoryReplSet;
const repo = createEventRepository();

async function seedUser(request: string): Promise<void> {
  await UserModel.create({
    email: `u-${request}-${Math.round(Math.random() * 1e9)}@example.com`,
    username: "user",
    phoneNumber: "123",
    description: "desc",
    request,
    image: { imageUrl: "https://cdn/x.jpg", imageKey: "x.jpg" },
  });
}

beforeAll(async () => {
  mem = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = mem.getUri();
  await connectToDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});

describe("event repository createCurrent (transaction, integration)", () => {
  it("flips the previous current off, creates exactly one current, resets all users", async () => {
    await EventModel.deleteMany({});
    await UserModel.deleteMany({});

    const previous = await EventModel.create({
      title: "Předchozí ročník",
      year: 2025,
      current: true,
    });
    await seedUser("pending");
    await seedUser("approved");

    const newId = await repo.createCurrent({
      title: "Nový ročník 2026",
      year: 2026,
    });

    // Exactly one current event, and it's the new one.
    const currentEvents = await EventModel.find({ current: true }).lean();
    expect(currentEvents).toHaveLength(1);
    expect(currentEvents[0]._id.toString()).toBe(newId);

    // Previous is flipped off.
    const prev = await EventModel.findById(previous._id).lean();
    expect(prev?.current).toBe(false);

    // Every user's request reset.
    const users = await UserModel.find().lean();
    expect(users).toHaveLength(2);
    expect(users.every((u) => u.request === "notsend")).toBe(true);
  });

  it("rolls back entirely when a mid-transaction op fails", async () => {
    await EventModel.deleteMany({});
    await UserModel.deleteMany({});

    const previous = await EventModel.create({
      title: "Stále aktuální ročník",
      year: 2025,
      current: true,
    });
    await seedUser("pending");

    // Force the final user-reset step to throw, aborting the transaction.
    const spy = vi.spyOn(UserModel, "updateMany").mockImplementationOnce(() => {
      throw new Error("forced failure");
    });

    await expect(
      repo.createCurrent({ title: "Nesmí projít ročník", year: 2026 }),
    ).rejects.toThrow();

    spy.mockRestore();

    // Nothing changed: still exactly one current (the previous), no new event,
    // the user's request untouched.
    const events = await EventModel.find().lean();
    expect(events).toHaveLength(1);
    expect(events[0]._id.toString()).toBe(previous._id.toString());
    expect(events[0].current).toBe(true);

    const users = await UserModel.find().lean();
    expect(users[0].request).toBe("pending");
  });
});

describe("event repository listPage (integration)", () => {
  it("paginates year-desc and reports the true total", async () => {
    await EventModel.deleteMany({});
    await EventModel.create([
      { title: "2024", year: 2024, current: false },
      { title: "2025", year: 2025, current: false },
      { title: "2026", year: 2026, current: true },
    ]);

    const first = await repo.listPage({ page: 1, pageSize: 2 });
    expect(first.total).toBe(3);
    expect(first.items.map((e) => e.year)).toEqual([2026, 2025]);

    const second = await repo.listPage({ page: 2, pageSize: 2 });
    expect(second.total).toBe(3);
    expect(second.items.map((e) => e.year)).toEqual([2024]);
  });
});
