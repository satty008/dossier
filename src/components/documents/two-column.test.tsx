import { describe, expect, it } from "vitest";

import { headerContactText, splitName } from "./two-column";

describe("splitName", () => {
  it("sets the last word apart from the ones before it", () => {
    expect(splitName("Jane Doe")).toEqual({ first: "Jane", last: "Doe" });
    expect(splitName("Maria del Carmen Garcia")).toEqual({ first: "Maria del Carmen", last: "Garcia" });
  });

  it("keeps a single word whole, as the last name", () => {
    expect(splitName("Madonna")).toEqual({ first: "", last: "Madonna" });
    expect(splitName("山田太郎")).toEqual({ first: "", last: "山田太郎" });
  });

  it("ignores the spaces around and between the words", () => {
    expect(splitName("  Jane \t Doe ")).toEqual({ first: "Jane", last: "Doe" });
    expect(splitName("")).toEqual({ first: "", last: "" });
  });
});

describe("headerContactText", () => {
  it("prints the person's name for their LinkedIn, as the template does", () => {
    expect(headerContactText({ kind: "linkedin", text: "linkedin.com/in/janedoe" }, "Jane Doe")).toBe("Jane Doe");
    expect(headerContactText({ kind: "linkedin", text: "linkedin.com/in/janedoe" }, "  ")).toBe("linkedin.com/in/janedoe");
  });

  it("prints just the handle of a profile on GitHub or GitLab", () => {
    expect(headerContactText({ kind: "website", text: "github.com/janedoe" }, "Jane Doe")).toBe("janedoe");
    expect(headerContactText({ kind: "website", text: "GitLab.com/janedoe/tidewater" }, "Jane Doe")).toBe("janedoe");
    // Without one, the address is all there is.
    expect(headerContactText({ kind: "website", text: "github.com" }, "Jane Doe")).toBe("github.com");
  });

  it("leaves everything else as it is", () => {
    expect(headerContactText({ kind: "website", text: "example.com/janedoe" }, "Jane Doe")).toBe("example.com/janedoe");
    expect(headerContactText({ kind: "email", text: "jane.doe@example.com" }, "Jane Doe")).toBe("jane.doe@example.com");
    expect(headerContactText({ kind: "phone", text: "+31 6 1234 5678" }, "Jane Doe")).toBe("+31 6 1234 5678");
    expect(headerContactText({ kind: "location", text: "Rotterdam, Netherlands" }, "Jane Doe")).toBe("Rotterdam, Netherlands");
  });
});
