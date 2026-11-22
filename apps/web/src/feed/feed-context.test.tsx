import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeedContext, useFeed } from "./feed-context.ts";
import { createFakeFeed } from "./feed-fixtures.ts";
import type { FeedService } from "./feed-service.ts";

function Probe({ onFeed }: { readonly onFeed: (feed: FeedService) => void }) {
  onFeed(useFeed());
  return <p>ready</p>;
}

describe("useFeed", () => {
  it("returns the service of the provider", () => {
    const { feed } = createFakeFeed();
    const seen = vi.fn<(feed: FeedService) => void>();

    render(
      <FeedContext.Provider value={feed}>
        <Probe onFeed={seen} />
      </FeedContext.Provider>,
    );

    expect(seen).toHaveBeenCalledWith(feed);
  });

  it("throws outside a provider", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const act = () => render(<Probe onFeed={() => undefined} />);

    expect(act).toThrow();
    quiet.mockRestore();
  });
});
