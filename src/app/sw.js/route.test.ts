import { describe, expect, it } from "vitest";

import { serviceWorkerSource } from "@/lib/service-worker";

import { GET } from "./route";

describe("GET /sw.js", () => {
  it("serves the worker as a script that's looked at again on every visit", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/javascript; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-cache");
    expect(await response.text()).toBe(serviceWorkerSource());
  });
});
