import { describe, expect, it } from "vitest";
import { computeScaledDimensions, renameToJpeg } from "./image-compression";

describe("computeScaledDimensions", () => {
  it("leaves images already within bounds unchanged", () => {
    expect(computeScaledDimensions(1600, 900, 2560)).toEqual({
      width: 1600,
      height: 900,
    });
  });

  it("scales a landscape image so the longest edge hits the max", () => {
    expect(computeScaledDimensions(6000, 4000, 2560)).toEqual({
      width: 2560,
      height: 1707,
    });
  });

  it("scales a portrait image by its height", () => {
    expect(computeScaledDimensions(4000, 6000, 2560)).toEqual({
      width: 1707,
      height: 2560,
    });
  });

  it("keeps a square image square", () => {
    expect(computeScaledDimensions(5000, 5000, 2560)).toEqual({
      width: 2560,
      height: 2560,
    });
  });

  it("never rounds a dimension below 1px", () => {
    const { width, height } = computeScaledDimensions(10000, 1, 2560);
    expect(width).toBe(2560);
    expect(height).toBe(1);
  });
});

describe("renameToJpeg", () => {
  it("swaps a known extension for .jpg", () => {
    expect(renameToJpeg("photo.png")).toBe("photo.jpg");
    expect(renameToJpeg("IMG_1234.HEIC")).toBe("IMG_1234.jpg");
  });

  it("appends .jpg when there is no extension", () => {
    expect(renameToJpeg("photo")).toBe("photo.jpg");
  });

  it("preserves dots inside the base name", () => {
    expect(renameToJpeg("my.holiday.photo.jpeg")).toBe("my.holiday.photo.jpg");
  });

  it("falls back to a default for an empty base", () => {
    expect(renameToJpeg(".jpeg")).toBe("photo.jpg");
  });
});
