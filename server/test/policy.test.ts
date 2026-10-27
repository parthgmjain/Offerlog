import { describe, expect, it } from "vitest";
import { decide } from "../src/policy.js";
import { testPolicy } from "./helpers.js";

describe("decide", () => {
  it("allows a tool listed in one of the client's rules", () => {
    expect(decide(testPolicy, "writer", "add_application")).toEqual({
      allowed: true,
      ruleId: "writer/write",
    });
  });

  it("denies a tool not listed for the client, with a default-deny rule id", () => {
    expect(decide(testPolicy, "reader", "add_application")).toEqual({
      allowed: false,
      ruleId: "reader/default-deny",
    });
  });

  it("denies unknown clients", () => {
    expect(decide(testPolicy, "stranger", "list_applications")).toEqual({
      allowed: false,
      ruleId: "unknown-client",
    });
  });

  it("denies tools that no rule names at all", () => {
    expect(decide(testPolicy, "writer", "delete_application").allowed).toBe(false);
  });
});
