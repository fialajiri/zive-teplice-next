import { describe, expect, it } from "vitest";
import { presignRequestSchema, MAX_UPLOAD_BYTES } from "./upload";

const validFile = {
  filename: "photo.jpg",
  contentType: "image/jpeg" as const,
  size: 1_000,
};

describe("presignRequestSchema", () => {
  it("accepts a single valid image for the news prefix", () => {
    const result = presignRequestSchema.safeParse({
      prefix: "news",
      files: [validFile],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-image content type before any URL is issued", () => {
    const result = presignRequestSchema.safeParse({
      prefix: "news",
      files: [{ ...validFile, contentType: "image/gif" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an oversize file", () => {
    const result = presignRequestSchema.safeParse({
      prefix: "news",
      files: [{ ...validFile, size: MAX_UPLOAD_BYTES + 1 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more files than the prefix allows (news = 1)", () => {
    const result = presignRequestSchema.safeParse({
      prefix: "news",
      files: [validFile, validFile],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty file list", () => {
    const result = presignRequestSchema.safeParse({
      prefix: "news",
      files: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown prefix", () => {
    const result = presignRequestSchema.safeParse({
      prefix: "../secrets",
      files: [validFile],
    });
    expect(result.success).toBe(false);
  });
});
