import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots", () => {
  it("allows public crawling and disallows private routes", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules?.allow).toBe("/");
    expect(rules?.disallow).toEqual(
      expect.arrayContaining([
        "/admin",
        "/ucet",
        "/prihlaseni",
        "/registrace",
        "/obnova-hesla",
        "/api/",
      ]),
    );
  });

  it("points the sitemap field at /sitemap.xml on the same origin", () => {
    const result = robots();
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
  });
});
