import { describe, expect, it } from "vitest";
import { canTransition } from "../src/status.js";

describe("canTransition", () => {
  it("allows forward moves along the active pipeline", () => {
    expect(canTransition("applied", "interviewing")).toBe(true);
    expect(canTransition("interviewing", "offer")).toBe(true);
    expect(canTransition("applied", "offer")).toBe(true);
  });

  it("allows rejected or withdrawn from any active state", () => {
    for (const from of ["applied", "interviewing", "offer"] as const) {
      expect(canTransition(from, "rejected")).toBe(true);
      expect(canTransition(from, "withdrawn")).toBe(true);
    }
  });

  it("blocks backward moves", () => {
    expect(canTransition("interviewing", "applied")).toBe(false);
    expect(canTransition("offer", "interviewing")).toBe(false);
  });

  it("blocks same-state updates", () => {
    expect(canTransition("applied", "applied")).toBe(false);
  });

  it("never moves out of a terminal state", () => {
    expect(canTransition("rejected", "applied")).toBe(false);
    expect(canTransition("withdrawn", "offer")).toBe(false);
    expect(canTransition("rejected", "withdrawn")).toBe(false);
  });
});
