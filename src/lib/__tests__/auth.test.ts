import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// Mock server-only (must be first)
vi.mock("server-only", () => ({}));

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

// Mock jose
vi.mock("jose", () => ({
  SignJWT: vi.fn(),
  jwtVerify: vi.fn(),
}));

import { getSession } from "../auth";

describe("getSession", () => {
  let cookies: any;
  let jwtVerify: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const nextHeaders = await import("next/headers");
    const jose = await import("jose");
    cookies = nextHeaders.cookies;
    jwtVerify = jose.jwtVerify;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("returns null when no token cookie exists", async () => {
    // Mock cookies to return undefined for auth-token
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null when token cookie has no value", async () => {
    // Mock cookies to return a cookie object without value
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ name: "auth-token" }),
    } as any);

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns session payload when token is valid", async () => {
    const mockToken = "valid-jwt-token";
    const mockPayload = {
      userId: "user-123",
      email: "test@example.com",
      expiresAt: new Date("2025-12-31"),
    };

    // Mock cookies to return a valid token
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: mockToken }),
    } as any);

    // Mock jwtVerify to return the payload
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: mockPayload,
    } as any);

    const session = await getSession();

    expect(session).toEqual(mockPayload);
    expect(jwtVerify).toHaveBeenCalledTimes(1);
    expect(jwtVerify).toHaveBeenCalledWith(
      mockToken,
      expect.any(Object) // JWT_SECRET (Uint8Array)
    );
  });

  test("returns null when token verification fails", async () => {
    const mockToken = "invalid-jwt-token";

    // Mock cookies to return a token
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: mockToken }),
    } as any);

    // Mock jwtVerify to throw an error (invalid token)
    vi.mocked(jwtVerify).mockRejectedValue(new Error("Invalid token"));

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null when token is expired", async () => {
    const mockToken = "expired-jwt-token";

    // Mock cookies to return a token
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: mockToken }),
    } as any);

    // Mock jwtVerify to throw an error (expired)
    vi.mocked(jwtVerify).mockRejectedValue(
      new Error("Token has expired")
    );

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("extracts correct cookie name", async () => {
    const mockGetCookie = vi.fn().mockReturnValue(undefined);

    vi.mocked(cookies).mockResolvedValue({
      get: mockGetCookie,
    } as any);

    await getSession();

    expect(mockGetCookie).toHaveBeenCalledWith("auth-token");
  });

  test("handles malformed JWT payload gracefully", async () => {
    const mockToken = "token-with-malformed-payload";

    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: mockToken }),
    } as any);

    // Mock jwtVerify to return malformed payload
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: null,
    } as any);

    const session = await getSession();

    // Should return null when cast as SessionPayload
    expect(session).toBeNull();
  });

  test("returns complete session payload with all fields", async () => {
    const mockToken = "complete-jwt-token";
    const mockExpiryDate = new Date("2026-01-15T10:30:00Z");
    const mockPayload = {
      userId: "user-456",
      email: "user@test.com",
      expiresAt: mockExpiryDate,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(mockExpiryDate.getTime() / 1000),
    };

    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: mockToken }),
    } as any);

    vi.mocked(jwtVerify).mockResolvedValue({
      payload: mockPayload,
    } as any);

    const session = await getSession();

    expect(session).toBeDefined();
    expect(session?.userId).toBe("user-456");
    expect(session?.email).toBe("user@test.com");
    expect(session?.expiresAt).toEqual(mockExpiryDate);
  });
});
