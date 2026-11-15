import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "@/components/toast";
import { install, type InstallWay } from "@/lib/install-prompt";

import { InstallApp } from "./install-app";

let way: InstallWay = "menu";
vi.mock("@/lib/install-prompt", () => ({
  installWay: () => way,
  subscribeToInstall: () => () => {},
  install: vi.fn(async () => true),
}));
vi.mock("@/components/toast", () => ({ toast: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  way = "menu";
});

describe("InstallApp", () => {
  it("offers a button where the browser has a dialog for it", async () => {
    way = "prompt";
    const user = userEvent.setup();
    render(<InstallApp />);
    expect(screen.getByText("Install as an app")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Install" }));
    expect(install).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith("Dossier is installed.");
  });

  it("says nothing when the dialog was dismissed", async () => {
    way = "prompt";
    vi.mocked(install).mockResolvedValueOnce(false);
    render(<InstallApp />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Install" }));
    expect(toast).not.toHaveBeenCalled();
  });

  it("points to the browser's own way when the dialog can't be opened", async () => {
    way = "prompt";
    vi.mocked(install).mockRejectedValueOnce(new Error("not allowed"));
    render(<InstallApp />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Install" }));
    expect(toast).toHaveBeenCalledWith("The browser couldn't open its install dialog. Its menu has the same choice.");
    expect(screen.getByRole("button", { name: "Install" })).not.toHaveAttribute("aria-disabled");
  });

  it("says where to tap in Safari on an iPhone, with no button", () => {
    way = "ios";
    render(<InstallApp />);
    expect(screen.getByText(/tap the Share button, then Add to Home Screen/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("points to the browser's menu elsewhere, with no button", () => {
    render(<InstallApp />);
    expect(screen.getByText(/Open your browser's menu and choose Install app/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("says why a page on plain HTTP can't be installed, with no button", () => {
    way = "insecure";
    render(<InstallApp />);
    expect(screen.getByText(/served over HTTPS, or from localhost, and this one is on plain HTTP/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("says it's installed once it runs as an app", () => {
    way = "installed";
    render(<InstallApp />);
    expect(screen.getByText("Dossier is running as an app on this device.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
