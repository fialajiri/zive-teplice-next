// @vitest-environment node
import { describe, expect, it } from "vitest";
import { verifyLegacyPassword } from "./password";

// Reference vector produced with the EXACT passport-local-mongoose defaults
// (pbkdf2, 25000 iters, keylen 512, sha256, hex; salt used as the hex string
// directly). This pins the crypto parameters so any drift — a changed iteration
// count, keylen, digest, or salt handling — fails the test loudly.
//
// NOTE: this is a synthetic vector, sufficient to lock the algorithm. The
// definitive check is against a *real* redacted `{ salt, hash }` captured from
// Atlas (git-ignored fixture) per the Phase 2 plan §0/§7 — drop it in here when
// available and assert the same true/false outcomes.
const SAMPLE = {
  password: "Zive-Teplice-2024!",
  salt: "a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00",
  hash: "13a2ec4ea0d5604a2febe5989d6d5ddfcac08a08c8162e1e2ffbabb403d80937e4e68ddc93739499ed0deb03520b3451b67e12d3741e7eb3b3fa611aed97feea4bc2148fefd3c92cab236d905baa6d294771b02f552f379921d56d78ee135ee3803256480b4100ef7ea8e4d6f9e2532ffcf6b3c4b323f44e935493ac9e648d57af11d989819741e05489c9e4e40c8f43dc38c2ffdbb78afe5b22485332482bf3ed90288214fdfe7be7b44cdaf11e5be2b422f229ad03e1706dcb8ae31c145699e3da138c44eac76f0e4e3e967d884a71821d6804d33bbb54cbabd5b397661f256c0e2f84c67259c5d3af98ba42a50b295419922faf5a3a0669493c9e5b1b6bc918d76802b26e4cd5e73f2958d742ef3af12c17b631877d982ea1d875885110548fadad8245a1f8f7e9982fd345d52977ab01ac8a9f984bc2b474547db691099468abbe6f46f2bb035583d1b3e0cb0fdc188b797eb1ee8200f85bf07e552d052a30fac4827963002af19f510c8837cb2744a796019381cd493d50f5f98b5a8a30b9da5edc49fe8bbbef039148521b832bbde594fb664c8582a097e6ed5d14ed1fc8af3d14827507771c258b1e172e5d9a17df12665c605cdaf7f632cb58b7b1874cf38510e65446145a4fd7261a373794535c18bf02e47f05e20a6aa1c6eab5c1f2b97daba5c75f7e93aebc6e914f7c91a450b0b99e7c57eaf34762c1b9861bd2",
};

describe("verifyLegacyPassword", () => {
  it("accepts the correct password for a legacy hash/salt", async () => {
    expect(
      await verifyLegacyPassword(SAMPLE.password, SAMPLE.salt, SAMPLE.hash),
    ).toBe(true);
  });

  it("rejects a wrong password", async () => {
    expect(
      await verifyLegacyPassword("wrong-password", SAMPLE.salt, SAMPLE.hash),
    ).toBe(false);
  });

  it("rejects when the salt does not match", async () => {
    expect(
      await verifyLegacyPassword(
        SAMPLE.password,
        "00000000000000000000000000000000",
        SAMPLE.hash,
      ),
    ).toBe(false);
  });

  it("returns false (never throws) for missing salt or hash", async () => {
    expect(await verifyLegacyPassword(SAMPLE.password, null, SAMPLE.hash)).toBe(
      false,
    );
    expect(await verifyLegacyPassword(SAMPLE.password, SAMPLE.salt, null)).toBe(
      false,
    );
    expect(await verifyLegacyPassword("", SAMPLE.salt, SAMPLE.hash)).toBe(
      false,
    );
  });

  it("returns false for a malformed (non-hex / wrong-length) hash", async () => {
    expect(
      await verifyLegacyPassword(SAMPLE.password, SAMPLE.salt, "not-hex"),
    ).toBe(false);
  });
});
