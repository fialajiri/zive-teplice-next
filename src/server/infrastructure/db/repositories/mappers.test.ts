import { describe, expect, it } from "vitest";
import { toImageDto, toPublicUrl } from "./mappers";

describe("toPublicUrl", () => {
  it("rewrites the S3 origin to the CloudFront CDN, preserving the key", () => {
    expect(
      toPublicUrl(
        "https://zive-teplice.s3.eu-central-1.amazonaws.com/Gallery/2023-06-19T18%3A51%3A42.074Z-IMG_5739.jpg",
      ),
    ).toBe(
      "https://d374dusjcsfayx.cloudfront.net/Gallery/2023-06-19T18%3A51%3A42.074Z-IMG_5739.jpg",
    );
  });

  it("leaves non-S3 URLs untouched", () => {
    const other = "https://d374dusjcsfayx.cloudfront.net/Gallery/x.jpg";
    expect(toPublicUrl(other)).toBe(other);
  });
});

describe("toImageDto", () => {
  it("returns null when the image pair is incomplete", () => {
    expect(toImageDto({ imageUrl: "https://x/y.jpg" })).toBeNull();
    expect(toImageDto(null)).toBeNull();
  });

  it("maps a complete pair and rewrites the URL to the CDN", () => {
    expect(
      toImageDto({
        imageUrl:
          "https://zive-teplice.s3.eu-central-1.amazonaws.com/News/a.jpg",
        imageKey: "News/a.jpg",
      }),
    ).toEqual({
      imageUrl: "https://d374dusjcsfayx.cloudfront.net/News/a.jpg",
      imageKey: "News/a.jpg",
    });
  });
});
