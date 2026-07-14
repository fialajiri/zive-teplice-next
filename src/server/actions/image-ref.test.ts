import { describe, expect, it } from "vitest";
import { isValidUploadedImage } from "./image-ref";

const HOST = "d374dusjcsfayx.cloudfront.net";

describe("isValidUploadedImage", () => {
  it("accepts a well-formed reference for the matching prefix", () => {
    expect(
      isValidUploadedImage(
        `https://${HOST}/gallery/2026-01-01-photo.jpg`,
        "gallery/2026-01-01-photo.jpg",
        "gallery",
      ),
    ).toBe(true);
  });

  it("rejects a key under a different prefix", () => {
    expect(
      isValidUploadedImage(
        `https://${HOST}/news/x.jpg`,
        "news/x.jpg",
        "gallery",
      ),
    ).toBe(false);
  });

  it("rejects a url whose path does not resolve to the key", () => {
    expect(
      isValidUploadedImage(
        `https://${HOST}/gallery/other.jpg`,
        "gallery/x.jpg",
        "gallery",
      ),
    ).toBe(false);
  });

  it("rejects a non-https url", () => {
    expect(
      isValidUploadedImage(
        `http://${HOST}/program/x.jpg`,
        "program/x.jpg",
        "program",
      ),
    ).toBe(false);
  });

  it("rejects a disallowed host", () => {
    expect(
      isValidUploadedImage(
        "https://evil.example.com/gallery/x.jpg",
        "gallery/x.jpg",
        "gallery",
      ),
    ).toBe(false);
  });

  it("rejects path traversal in the key", () => {
    expect(
      isValidUploadedImage(
        `https://${HOST}/gallery/../secrets`,
        "gallery/../secrets",
        "gallery",
      ),
    ).toBe(false);
  });
});
