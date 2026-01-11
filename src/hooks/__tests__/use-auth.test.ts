import { test, expect, vi, beforeEach, describe } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "../use-auth";
import type { AuthResult } from "@/actions";

// Mock dependencies
const mockPush = vi.fn();
const mockUseRouter = vi.fn(() => ({
  push: mockPush,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mockUseRouter(),
}));

const mockSignIn = vi.fn<(email: string, password: string) => Promise<AuthResult>>();
const mockSignUp = vi.fn<(email: string, password: string) => Promise<AuthResult>>();

vi.mock("@/actions", () => ({
  signIn: (email: string, password: string) => mockSignIn(email, password),
  signUp: (email: string, password: string) => mockSignUp(email, password),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();
vi.mock("@/actions/create-project", () => ({
  createProject: (input: any) => mockCreateProject(input),
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    test("returns initial state with isLoading false", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.signIn).toBeDefined();
      expect(result.current.signUp).toBeDefined();
    });
  });

  describe("signIn", () => {
    test("sets isLoading to true during sign in and false after completion", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });
      mockGetAnonWorkData.mockReturnValue(null);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      const signInPromise = result.current.signIn("test@example.com", "password");

      // Check synchronously - isLoading should be set immediately
      await act(async () => {
        await signInPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("calls signInAction with correct credentials", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "password123");
    });

    test("returns error result when sign in fails", async () => {
      const errorResult = { success: false, error: "Invalid credentials" };
      mockSignIn.mockResolvedValue(errorResult);

      const { result } = renderHook(() => useAuth());

      let authResult;
      await act(async () => {
        authResult = await result.current.signIn("test@example.com", "wrong-password");
      });

      expect(authResult).toEqual(errorResult);
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("navigates to new project with anonymous work after successful sign in", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "test message" }],
        fileSystemData: { "/App.jsx": "content" },
      });
      mockCreateProject.mockResolvedValue({
        id: "project-123",
        name: "Design from 10:30:45 AM",
        userId: "user-1",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(mockGetAnonWorkData).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from"),
        messages: [{ role: "user", content: "test message" }],
        data: { "/App.jsx": "content" },
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-123");
    });

    test("navigates to most recent project when no anonymous work exists", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([
        {
          id: "recent-project",
          name: "Recent Design",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "older-project",
          name: "Older Design",
          createdAt: new Date(Date.now() - 10000),
          updatedAt: new Date(Date.now() - 10000),
        },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/recent-project");
    });

    test("creates new project when no projects exist and no anonymous work", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({
        id: "new-project-456",
        name: "New Design #12345",
        userId: "user-1",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringContaining("New Design #"),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/new-project-456");
    });

    test("handles empty anonymous work messages array as no work", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [],
        fileSystemData: {},
      });
      mockGetProjects.mockResolvedValue([
        {
          id: "existing-project",
          name: "Existing",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      // Should skip anonymous work since messages array is empty
      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-project");
    });

    test("ensures isLoading is set to false even if an error occurs", async () => {
      mockSignIn.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signIn("test@example.com", "password");
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("sets isLoading to true during sign up and false after completion", async () => {
      mockSignUp.mockResolvedValue({ success: false, error: "Email already exists" });
      mockGetAnonWorkData.mockReturnValue(null);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.signUp("test@example.com", "password");
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("calls signUpAction with correct credentials", async () => {
      mockSignUp.mockResolvedValue({ success: false, error: "Invalid email" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@example.com", "securepass123");
      });

      expect(mockSignUp).toHaveBeenCalledWith("newuser@example.com", "securepass123");
    });

    test("returns error result when sign up fails", async () => {
      const errorResult = { success: false, error: "Email already registered" };
      mockSignUp.mockResolvedValue(errorResult);

      const { result } = renderHook(() => useAuth());

      let authResult;
      await act(async () => {
        authResult = await result.current.signUp("test@example.com", "password");
      });

      expect(authResult).toEqual(errorResult);
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("navigates to new project with anonymous work after successful sign up", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "create a button" }],
        fileSystemData: { "/Button.jsx": "export default function Button() {}" },
      });
      mockCreateProject.mockResolvedValue({
        id: "signup-project-789",
        name: "Design from 3:15:22 PM",
        userId: "new-user-2",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@example.com", "password123");
      });

      expect(mockGetAnonWorkData).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from"),
        messages: [{ role: "user", content: "create a button" }],
        data: { "/Button.jsx": "export default function Button() {}" },
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/signup-project-789");
    });

    test("creates new project after successful sign up with no existing projects", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({
        id: "first-project-999",
        name: "New Design #54321",
        userId: "new-user-3",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("brand-new@example.com", "password");
      });

      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringContaining("New Design #"),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/first-project-999");
    });

    test("ensures isLoading is set to false even if an error occurs", async () => {
      mockSignUp.mockRejectedValue(new Error("Database error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signUp("test@example.com", "password");
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("handlePostSignIn behavior", () => {
    test("prioritizes anonymous work over existing projects", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "anon work" }],
        fileSystemData: {},
      });
      mockGetProjects.mockResolvedValue([
        {
          id: "existing",
          name: "Existing",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      mockCreateProject.mockResolvedValue({
        id: "anon-project",
        name: "Design from 5:00:00 PM",
        userId: "user-1",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      // Should create project from anon work, not navigate to existing project
      expect(mockCreateProject).toHaveBeenCalled();
      expect(mockGetProjects).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/anon-project");
    });

    test("generates unique project name with timestamp for anonymous work", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "test" }],
        fileSystemData: {},
      });
      mockCreateProject.mockResolvedValue({
        id: "time-project",
        name: "Design from 11:45:30 AM",
        userId: "user-1",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringMatching(/^Design from \d{1,2}:\d{2}:\d{2}/),
        })
      );
    });

    test("generates unique project name with random number when no projects exist", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({
        id: "random-project",
        name: "New Design #42",
        userId: "user-1",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringMatching(/^New Design #\d+$/),
        })
      );
    });
  });

  describe("edge cases", () => {
    test("handles null anonymous work data correctly", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([
        {
          id: "proj-1",
          name: "Project 1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj-1");
    });

    test("handles undefined anonymous work data correctly", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(undefined as any);
      mockGetProjects.mockResolvedValue([
        {
          id: "proj-2",
          name: "Project 2",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj-2");
    });

    test("does not navigate when auth action fails", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "Sync error" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("handles API errors during post-signin flow", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signIn("test@example.com", "password");
        } catch (error) {
          // Expected error from getProjects
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});
