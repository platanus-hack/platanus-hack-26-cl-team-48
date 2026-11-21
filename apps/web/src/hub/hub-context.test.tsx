import { createMemoryHub, type Hub, type HubProfile } from "@nodomics/hub";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HubContext, useHub, useHubProfile } from "./hub-context.ts";

const ana: HubProfile = { id: "u-ana", handle: "ana", displayName: "Ana Pérez" };
const SIGNED_OUT = "Sin sesión";

const memoryHub = () => createMemoryHub({ profiles: [ana], now: () => "2026-11-21T00:00:00Z" });

function ProfileHandle() {
  const profile = useHubProfile();
  return <p>{profile?.handle ?? SIGNED_OUT}</p>;
}

function HubUser() {
  useHub();
  return <p>Con hub</p>;
}

const renderWithHub = (hub: Hub) =>
  render(
    <HubContext value={hub}>
      <ProfileHandle />
    </HubContext>,
  );

function countingListeners(hub: Hub) {
  const listeners = { active: 0 };
  const counted: Hub = {
    ...hub,
    onProfileChange: (listener) => {
      listeners.active += 1;
      const unsubscribe = hub.onProfileChange(listener);
      return () => {
        listeners.active -= 1;
        unsubscribe();
      };
    },
  };
  return { hub: counted, listeners };
}

describe("useHub", () => {
  it("returns the hub given by the provider", () => {
    render(
      <HubContext value={memoryHub()}>
        <HubUser />
      </HubContext>,
    );

    expect(screen.getByText("Con hub")).toBeDefined();
  });

  it("throws when there is no hub provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const rendering = () => render(<HubUser />);

    expect(rendering).toThrow();
    vi.restoreAllMocks();
  });
});

describe("useHubProfile", () => {
  it("has no profile before the hub answers", () => {
    const hub = memoryHub();

    renderWithHub(hub);

    expect(screen.getByText(SIGNED_OUT)).toBeDefined();
  });

  it("gives the hub's current profile once it resolves", async () => {
    const hub = memoryHub();
    await hub.signIn({ kind: "provider", provider: "github" });

    renderWithHub(hub);

    expect(await screen.findByText("ana")).toBeDefined();
  });

  it("follows a sign in that happens after rendering", async () => {
    const hub = memoryHub();
    renderWithHub(hub);
    await screen.findByText(SIGNED_OUT);

    await act(() => hub.signIn({ kind: "email", email: "ana" }));

    expect(await screen.findByText("ana")).toBeDefined();
  });

  it("follows a sign out", async () => {
    const hub = memoryHub();
    await hub.signIn({ kind: "provider", provider: "github" });
    renderWithHub(hub);
    await screen.findByText("ana");

    await act(() => hub.signOut());

    expect(await screen.findByText(SIGNED_OUT)).toBeDefined();
  });

  it("listens to profile changes while mounted", async () => {
    const { hub, listeners } = countingListeners(memoryHub());

    renderWithHub(hub);
    await screen.findByText(SIGNED_OUT);

    expect(listeners.active).toBe(1);
  });

  it("stops listening to profile changes when unmounted", async () => {
    const { hub, listeners } = countingListeners(memoryHub());
    const { unmount } = renderWithHub(hub);
    await screen.findByText(SIGNED_OUT);

    unmount();

    expect(listeners.active).toBe(0);
  });
});
