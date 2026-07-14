import { describe, expect, it } from "vitest";
import { sanitizeFilename, buildObjectKey, buildPublicUrl } from "./storage";

describe("sanitizeFilename", () => {
  it("keeps a normal name but replaces spaces", () => {
    expect(sanitizeFilename("my photo.JPG")).toBe("my-photo.JPG");
  });

  it("strips any path component (no directory traversal into the key)", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("foo/bar\\baz.png")).toBe("baz.png");
  });

  it("transliterates diacritics and drops unsafe characters", () => {
    expect(sanitizeFilename("černá kočka?.png")).toBe("cerna-kocka-.png");
  });

  it("falls back to 'file' when nothing usable remains", () => {
    expect(sanitizeFilename("***")).toBe("file");
    expect(sanitizeFilename("")).toBe("file");
  });
});

describe("buildObjectKey", () => {
  it("builds <prefix>/<ISO-timestamp>-<safe name>", () => {
    const now = new Date("2026-07-13T10:00:00.000Z");
    expect(buildObjectKey("news", "My Photo.jpg", now)).toBe(
      "news/2026-07-13T10:00:00.000Z-My-Photo.jpg",
    );
  });
});

describe("buildPublicUrl", () => {
  it("prefixes the public host with https", () => {
    expect(buildPublicUrl("d374dusjcsfayx.cloudfront.net", "news/x.jpg")).toBe(
      "https://d374dusjcsfayx.cloudfront.net/news/x.jpg",
    );
  });
});
