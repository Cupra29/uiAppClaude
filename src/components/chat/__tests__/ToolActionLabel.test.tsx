import { test, expect, afterEach, describe } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolActionLabel } from "../ToolActionLabel";

afterEach(() => {
  cleanup();
});

describe("ToolActionLabel - str_replace_editor", () => {
  test("renders create command with file name", () => {
    const args = JSON.stringify({
      command: "create",
      path: "/components/Button.jsx",
      file_text: "export default Button",
    });

    render(<ToolActionLabel toolName="str_replace_editor" args={args} />);
    expect(screen.getByText("Creating Button.jsx")).toBeDefined();
  });

  test("renders str_replace command with file name", () => {
    const args = JSON.stringify({
      command: "str_replace",
      path: "/App.jsx",
      old_str: "old code",
      new_str: "new code",
    });

    render(<ToolActionLabel toolName="str_replace_editor" args={args} />);
    expect(screen.getByText("Editing App.jsx")).toBeDefined();
  });

  test("renders insert command with file name", () => {
    const args = JSON.stringify({
      command: "insert",
      path: "/components/Header.tsx",
      insert_line: 10,
      new_str: "new line",
    });

    render(<ToolActionLabel toolName="str_replace_editor" args={args} />);
    expect(screen.getByText("Inserting into Header.tsx")).toBeDefined();
  });

  test("renders view command with file name", () => {
    const args = JSON.stringify({
      command: "view",
      path: "/README.md",
    });

    render(<ToolActionLabel toolName="str_replace_editor" args={args} />);
    expect(screen.getByText("Viewing README.md")).toBeDefined();
  });

  test("renders fallback for unknown command with file name", () => {
    const args = JSON.stringify({
      command: "unknown",
      path: "/file.js",
    });

    render(<ToolActionLabel toolName="str_replace_editor" args={args} />);
    expect(screen.getByText("Editing file.js")).toBeDefined();
  });

  test("renders fallback for unknown command without file name", () => {
    const args = JSON.stringify({
      command: "unknown",
    });

    render(<ToolActionLabel toolName="str_replace_editor" args={args} />);
    expect(screen.getByText("Editing file")).toBeDefined();
  });

  test("handles nested file paths correctly", () => {
    const args = JSON.stringify({
      command: "create",
      path: "/src/components/ui/Button.tsx",
    });

    render(<ToolActionLabel toolName="str_replace_editor" args={args} />);
    expect(screen.getByText("Creating Button.tsx")).toBeDefined();
  });
});

describe("ToolActionLabel - file_manager", () => {
  test("renders delete command with file name", () => {
    const args = JSON.stringify({
      command: "delete",
      path: "/components/OldComponent.jsx",
    });

    render(<ToolActionLabel toolName="file_manager" args={args} />);
    expect(screen.getByText("Deleting OldComponent.jsx")).toBeDefined();
  });

  test("renders rename command with both file names", () => {
    const args = JSON.stringify({
      command: "rename",
      old_path: "/components/Button.jsx",
      new_path: "/components/ActionButton.jsx",
    });

    render(<ToolActionLabel toolName="file_manager" args={args} />);
    expect(
      screen.getByText("Renaming Button.jsx to ActionButton.jsx")
    ).toBeDefined();
  });

  test("renders fallback for unknown file_manager command with file name", () => {
    const args = JSON.stringify({
      command: "unknown",
      path: "/file.js",
    });

    render(<ToolActionLabel toolName="file_manager" args={args} />);
    expect(screen.getByText("Managing file.js")).toBeDefined();
  });

  test("renders fallback for unknown file_manager command without file name", () => {
    const args = JSON.stringify({
      command: "unknown",
    });

    render(<ToolActionLabel toolName="file_manager" args={args} />);
    expect(screen.getByText("Managing files")).toBeDefined();
  });
});

describe("ToolActionLabel - edge cases", () => {
  test("handles missing args gracefully", () => {
    render(<ToolActionLabel toolName="str_replace_editor" />);
    expect(screen.getByText("Editing file")).toBeDefined();
  });

  test("handles empty args gracefully", () => {
    render(<ToolActionLabel toolName="str_replace_editor" args="" />);
    expect(screen.getByText("Editing file")).toBeDefined();
  });

  test("handles invalid JSON args gracefully", () => {
    render(
      <ToolActionLabel toolName="str_replace_editor" args="invalid json{" />
    );
    expect(screen.getByText("Editing file")).toBeDefined();
  });

  test("handles unknown tool name with fallback", () => {
    const args = JSON.stringify({
      command: "test",
      path: "/file.js",
    });

    render(<ToolActionLabel toolName="unknown_tool" args={args} />);
    expect(screen.getByText("unknown_tool")).toBeDefined();
  });

  test("handles missing path in args for create command", () => {
    const args = JSON.stringify({
      command: "create",
    });

    render(<ToolActionLabel toolName="str_replace_editor" args={args} />);
    // When no path, shows "Creating file"
    expect(screen.getByText("Creating file")).toBeDefined();
  });

  test("renders correct icon for create action", () => {
    const args = JSON.stringify({
      command: "create",
      path: "/test.js",
    });

    const { container } = render(
      <ToolActionLabel toolName="str_replace_editor" args={args} />
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeDefined();
    expect(svg?.classList.contains("text-green-600")).toBe(true);
  });

  test("renders correct icon for delete action", () => {
    const args = JSON.stringify({
      command: "delete",
      path: "/test.js",
    });

    const { container } = render(
      <ToolActionLabel toolName="file_manager" args={args} />
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeDefined();
    expect(svg?.classList.contains("text-red-600")).toBe(true);
  });

  test("extracts file name from path with leading slash", () => {
    const args = JSON.stringify({
      command: "create",
      path: "/App.jsx",
    });

    render(<ToolActionLabel toolName="str_replace_editor" args={args} />);
    expect(screen.getByText("Creating App.jsx")).toBeDefined();
  });

  test("extracts file name from path without leading slash", () => {
    const args = JSON.stringify({
      command: "create",
      path: "components/Button.jsx",
    });

    render(<ToolActionLabel toolName="str_replace_editor" args={args} />);
    expect(screen.getByText("Creating Button.jsx")).toBeDefined();
  });
});

describe("ToolActionLabel - component structure", () => {
  test("renders with correct wrapper classes", () => {
    const args = JSON.stringify({
      command: "create",
      path: "/test.js",
    });

    const { container } = render(
      <ToolActionLabel toolName="str_replace_editor" args={args} />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.classList.contains("inline-flex")).toBe(true);
    expect(wrapper.classList.contains("items-center")).toBe(true);
    expect(wrapper.classList.contains("gap-2")).toBe(true);
  });

  test("contains both icon and text elements", () => {
    const args = JSON.stringify({
      command: "create",
      path: "/test.js",
    });

    const { container } = render(
      <ToolActionLabel toolName="str_replace_editor" args={args} />
    );
    const wrapper = container.firstChild as HTMLElement;
    const svg = wrapper.querySelector("svg");
    const span = wrapper.querySelector("span");

    expect(svg).toBeDefined();
    expect(span).toBeDefined();
    expect(span?.textContent).toBe("Creating test.js");
  });
});
