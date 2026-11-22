import { parse } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import {
  MAX_REGISTRATION_IMAGES,
  REGISTRATION_IMAGE_MEDIA_TYPES,
  RegistrationRequestSchema,
  type RegistrationImage,
} from "./index.ts";

const PNG: RegistrationImage = { mediaType: "image/png", base64: "iVBORw0KGgo=" };

const isAccepted = (body: unknown): boolean => parse(RegistrationRequestSchema, body).ok;

const images = (count: number): RegistrationImage[] => Array.from({ length: count }, () => PNG);

describe("registration image constants", () => {
  it("allows at most 4 images", () => {
    expect(MAX_REGISTRATION_IMAGES).toBe(4);
  });

  it("lists jpeg, png and webp as the accepted media types", () => {
    expect([...REGISTRATION_IMAGE_MEDIA_TYPES]).toEqual(["image/jpeg", "image/png", "image/webp"]);
  });
});

describe("RegistrationRequestSchema images", () => {
  it("accepts a request with only one image", () => {
    const body = { images: [PNG] };

    expect(isAccepted(body)).toBe(true);
  });

  it.each(["image/jpeg", "image/png", "image/webp"])("accepts an image of type %s", (mediaType) => {
    const body = { images: [{ mediaType, base64: "iVBORw0KGgo=" }] };

    expect(isAccepted(body)).toBe(true);
  });

  it("accepts exactly the maximum number of images", () => {
    const body = { images: images(MAX_REGISTRATION_IMAGES) };

    expect(isAccepted(body)).toBe(true);
  });

  it("rejects more than the maximum number of images", () => {
    const body = { images: images(MAX_REGISTRATION_IMAGES + 1) };

    expect(isAccepted(body)).toBe(false);
  });

  it("rejects an empty images array", () => {
    const body = { images: [] };

    expect(isAccepted(body)).toBe(false);
  });

  it.each(["image/gif", "application/pdf", "image/svg+xml", ""])(
    "rejects an image of type %j",
    (mediaType) => {
      const body = { images: [{ mediaType, base64: "iVBORw0KGgo=" }] };

      expect(isAccepted(body)).toBe(false);
    },
  );

  it("rejects an image with empty base64", () => {
    const body = { images: [{ mediaType: "image/png", base64: "" }] };

    expect(isAccepted(body)).toBe(false);
  });

  it("rejects an image with unknown fields", () => {
    const body = { images: [{ ...PNG, name: "store.png" }] };

    expect(isAccepted(body)).toBe(false);
  });

  it("rejects an image without base64", () => {
    const body = { images: [{ mediaType: "image/png" }] };

    expect(isAccepted(body)).toBe(false);
  });

  it("rejects an image without a media type", () => {
    const body = { images: [{ base64: "iVBORw0KGgo=" }] };

    expect(isAccepted(body)).toBe(false);
  });

  it("rejects images that are not an array", () => {
    const body = { images: PNG };

    expect(isAccepted(body)).toBe(false);
  });
});

describe("RegistrationRequestSchema lookupSummary", () => {
  it("accepts a request with only a lookup summary", () => {
    const body = { lookupSummary: "Corner grocery store in Valparaíso, open since 1998." };

    expect(isAccepted(body)).toBe(true);
  });

  it("rejects an empty lookup summary", () => {
    const body = { lookupSummary: "" };

    expect(isAccepted(body)).toBe(false);
  });

  it("rejects a lookup summary that is not a string", () => {
    const body = { lookupSummary: 42 };

    expect(isAccepted(body)).toBe(false);
  });

  it("accepts images, a lookup summary and the existing sources together", () => {
    const body = {
      images: [PNG],
      lookupSummary: "Grocery store",
      text: "I run a store",
      pdfBase64: "QUJD",
      githubLogin: "octocat",
    };

    expect(isAccepted(body)).toBe(true);
  });

  it("still rejects unknown top-level fields", () => {
    const body = { images: [PNG], photos: [PNG] };

    expect(isAccepted(body)).toBe(false);
  });
});
