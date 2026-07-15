// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectToDatabase } from "../connection";
import { createPerformerRepository } from "./performer.repository";
import { UserModel } from "../models/user.model";

let mem: MongoMemoryServer;
const repo = createPerformerRepository();

const baseUser = {
  authStrategy: "local",
  phoneNumber: "777123456",
  description: "",
  image: { imageUrl: "https://cdn/p.jpg", imageKey: "p.jpg" },
};

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mem.getUri();
  await connectToDatabase();

  await UserModel.create([
    {
      ...baseUser,
      email: "a@x.cz",
      username: "Alena Bošková",
      role: "user",
      request: "approved",
    },
    {
      ...baseUser,
      email: "b@x.cz",
      username: "Bread Bros Bakery",
      role: "user",
      request: "notsend",
    },
    {
      ...baseUser,
      email: "c@x.cz",
      username: "Pending Person",
      role: "user",
      request: "pending",
    },
    // Admin accounts must never surface in a public search.
    {
      ...baseUser,
      email: "admin@x.cz",
      username: "Admin Alena",
      role: "admin",
      request: "approved",
    },
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});

describe("performer repository search (integration)", () => {
  it("matches username case- and diacritic-insensitively", async () => {
    const { items, total } = await repo.search({
      query: "boskova",
      page: 1,
      pageSize: 12,
    });
    expect(total).toBe(1);
    expect(items[0]?.username).toBe("Alena Bošková");
  });

  it("never returns admin accounts", async () => {
    const { items } = await repo.search({
      query: "alena",
      page: 1,
      pageSize: 12,
    });
    expect(items.map((i) => i.username)).toEqual(["Alena Bošková"]);
  });

  it("returns an empty result set for a non-matching query", async () => {
    const { items, total } = await repo.search({
      query: "zzz-nothing-matches",
      page: 1,
      pageSize: 12,
    });
    expect(items).toEqual([]);
    expect(total).toBe(0);
  });

  it("restricts to request:approved when onlyApproved is set", async () => {
    const { items, total } = await repo.search({
      onlyApproved: true,
      page: 1,
      pageSize: 12,
    });
    expect(total).toBe(1);
    expect(items[0]?.username).toBe("Alena Bošková");
  });

  it("paginates with correct skip/limit and total count", async () => {
    const pageOne = await repo.search({ page: 1, pageSize: 2 });
    const pageTwo = await repo.search({ page: 2, pageSize: 2 });
    expect(pageOne.total).toBe(3);
    expect(pageOne.items).toHaveLength(2);
    expect(pageTwo.items).toHaveLength(1);
    const allUsernames = [...pageOne.items, ...pageTwo.items].map(
      (i) => i.username,
    );
    expect(new Set(allUsernames).size).toBe(3);
  });
});

describe("performer repository searchForAdmin (integration)", () => {
  it("matches username case- and diacritic-insensitively", async () => {
    const { items, total } = await repo.searchForAdmin({
      query: "boskova",
      page: 1,
      pageSize: 12,
    });
    expect(total).toBe(1);
    expect(items[0]?.username).toBe("Alena Bošková");
  });

  it("also matches by email — unlike the public search", async () => {
    const { items, total } = await repo.searchForAdmin({
      query: "b@x.cz",
      page: 1,
      pageSize: 12,
    });
    expect(total).toBe(1);
    expect(items[0]?.email).toBe("b@x.cz");
  });

  it("returns account-level fields (email, phone, request)", async () => {
    const { items } = await repo.searchForAdmin({
      query: "boskova",
      page: 1,
      pageSize: 12,
    });
    expect(items[0]).toMatchObject({
      email: "a@x.cz",
      phoneNumber: "777123456",
      request: "approved",
    });
  });

  it("never returns admin accounts", async () => {
    const { items } = await repo.searchForAdmin({
      query: "alena",
      page: 1,
      pageSize: 12,
    });
    expect(items.map((i) => i.username)).toEqual(["Alena Bošková"]);
  });

  it("with no query, returns every non-admin performer", async () => {
    const { items, total } = await repo.searchForAdmin({
      page: 1,
      pageSize: 12,
    });
    expect(total).toBe(3);
    expect(items).toHaveLength(3);
  });

  it("paginates with correct skip/limit and total count", async () => {
    const pageOne = await repo.searchForAdmin({ page: 1, pageSize: 2 });
    const pageTwo = await repo.searchForAdmin({ page: 2, pageSize: 2 });
    expect(pageOne.total).toBe(3);
    expect(pageOne.items).toHaveLength(2);
    expect(pageTwo.items).toHaveLength(1);
  });
});
