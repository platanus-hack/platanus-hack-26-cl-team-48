import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useLocalAddress } from "./use-local-address.ts";

describe("local address", () => {
  it("clears the error when the address is edited", () => {
    const { result } = renderHook(() => useLocalAddress(() => {}));
    act(() => {
      result.current.connect();
    });
    expect(result.current.error).toBeDefined();

    act(() => {
      result.current.setAddress("ws://localhost/?token=x");
    });

    expect(result.current.error).toBeUndefined();
  });

  it("clears the error when a valid address connects", () => {
    const connected: string[] = [];
    const { result } = renderHook(() =>
      useLocalAddress((address) => connected.push(address.token)),
    );
    act(() => {
      result.current.connect();
    });
    expect(result.current.error).toBeDefined();

    act(() => {
      result.current.setAddress("ws://localhost/?token=x");
    });
    act(() => {
      result.current.connect();
    });

    expect(connected).toEqual(["x"]);
    expect(result.current.error).toBeUndefined();
  });
});
