import { describe, expect, it } from "vitest";
import { forgetPublishIntent, rememberPublishIntent, takePublishIntent } from "./publish-intent";

function memory() {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

const blocked = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};

describe("the wish to publish, kept from sign-up to the first sign-in", () => {
  it("is true once, for the address that asked", () => {
    const store = memory();
    rememberPublishIntent("Rova@Example.test ", store);
    expect(takePublishIntent("rova@example.test", store)).toBe(true);
    expect(takePublishIntent("rova@example.test", store)).toBe(false);
    expect(store.items.size).toBe(0);
  });

  it("is not used up by another account signing in on the same browser", () => {
    const store = memory();
    rememberPublishIntent("rova@example.test", store);
    expect(takePublishIntent("soa@example.test", store)).toBe(false);
    expect(takePublishIntent("rova@example.test", store)).toBe(true);
  });

  it("is dropped when the switch is turned off", () => {
    const store = memory();
    rememberPublishIntent("rova@example.test", store);
    forgetPublishIntent(store);
    expect(takePublishIntent("rova@example.test", store)).toBe(false);
  });

  it("is simply absent when the browser keeps nothing", () => {
    expect(() => rememberPublishIntent("rova@example.test", blocked)).not.toThrow();
    expect(() => forgetPublishIntent(blocked)).not.toThrow();
    expect(takePublishIntent("rova@example.test", blocked)).toBe(false);
    expect(takePublishIntent("rova@example.test", null)).toBe(false);
  });
});
