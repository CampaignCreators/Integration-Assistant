import { describe, expect, it } from "vitest";
import { isLocalSupabaseUrl, localDevCredentials } from "./local-dev";

/**
 * These guards are the only thing standing between a convenience button and a
 * one-click session on a real project, so each condition is checked on its own.
 */

const LOCAL = {
  NODE_ENV: "development",
  LOCAL_DEV_EMAIL: "demo@example.com",
  LOCAL_DEV_PASSWORD: "local-dev-password",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
};

describe("localDevCredentials", () => {
  it("returns the credentials when everything is local and configured", () => {
    expect(localDevCredentials(LOCAL)).toEqual({
      email: "demo@example.com",
      password: "local-dev-password",
    });
  });

  it("is off in production, whatever else is set", () => {
    expect(localDevCredentials({ ...LOCAL, NODE_ENV: "production" })).toBeNull();
  });

  it("is off against a hosted Supabase project", () => {
    expect(
      localDevCredentials({
        ...LOCAL,
        NEXT_PUBLIC_SUPABASE_URL: "https://abcdefgh.supabase.co",
      })
    ).toBeNull();
  });

  it("is off when the credentials are absent", () => {
    expect(localDevCredentials({ ...LOCAL, LOCAL_DEV_EMAIL: undefined })).toBeNull();
    expect(localDevCredentials({ ...LOCAL, LOCAL_DEV_PASSWORD: undefined })).toBeNull();
  });

  it("treats a blank email as absent rather than signing in as ''", () => {
    expect(localDevCredentials({ ...LOCAL, LOCAL_DEV_EMAIL: "   " })).toBeNull();
  });

  it("is off when the Supabase URL is missing or unparseable", () => {
    expect(localDevCredentials({ ...LOCAL, NEXT_PUBLIC_SUPABASE_URL: undefined })).toBeNull();
    expect(localDevCredentials({ ...LOCAL, NEXT_PUBLIC_SUPABASE_URL: "not a url" })).toBeNull();
  });
});

describe("isLocalSupabaseUrl", () => {
  it.each([
    "http://localhost:54321",
    "http://127.0.0.1:54321",
    "http://[::1]:54321",
    "http://0.0.0.0:54321",
  ])("accepts %s", (url) => {
    expect(isLocalSupabaseUrl(url)).toBe(true);
  });

  it.each([
    "https://abcdefgh.supabase.co",
    "https://localhost.example.com",
    "http://127.0.0.1.example.com",
    "http://notlocalhost",
    "",
  ])("rejects %s", (url) => {
    expect(isLocalSupabaseUrl(url)).toBe(false);
  });
});
