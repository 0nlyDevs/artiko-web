import { describe, expect, it, vi } from "vitest";
import { MAX_ITEMS, PAGE_LIMIT, readAll, type Page } from "./paging";

/** A list endpoint over `total` numbered items, as the API pages them. */
const endpoint = (total: number) => vi.fn(async ({ limit, offset }: Page) => Array.from({ length: Math.max(0, Math.min(limit, total - offset)) }, (_, i) => offset + i));
const numbers = (count: number) => Array.from({ length: count }, (_, i) => i);

describe("readAll", () => {
  it("stops at the first page shorter than the limit", async () => {
    const readPage = endpoint(7);
    expect(await readAll(readPage, { limit: 3 })).toEqual(numbers(7));
    expect(readPage.mock.calls.map(([page]) => page)).toEqual([
      { limit: 3, offset: 0 },
      { limit: 3, offset: 3 },
      { limit: 3, offset: 6 },
    ]);
  });

  it("stops on an empty page when the list ends on a full one", async () => {
    const readPage = endpoint(6);
    expect(await readAll(readPage, { limit: 3 })).toEqual(numbers(6));
    expect(readPage.mock.calls.map(([page]) => page.offset)).toEqual([0, 3, 6]);
  });

  it("reads one page when the list fits in it, or is empty", async () => {
    const short = endpoint(2);
    expect(await readAll(short, { limit: 3 })).toEqual([0, 1]);
    expect(short).toHaveBeenCalledTimes(1);

    const empty = endpoint(0);
    expect(await readAll(empty, { limit: 3 })).toEqual([]);
    expect(empty).toHaveBeenCalledTimes(1);
  });

  it("stops at the cap, however long the list is", async () => {
    const readPage = endpoint(1_000_000);
    expect(await readAll(readPage, { limit: 3, cap: 9 })).toEqual(numbers(9));
    expect(readPage).toHaveBeenCalledTimes(3);
  });

  it("cuts the last page at a cap that falls inside it", async () => {
    const readPage = endpoint(1_000_000);
    expect(await readAll(readPage, { limit: 3, cap: 7 })).toEqual(numbers(7));
    expect(readPage).toHaveBeenCalledTimes(3);
  });

  it("asks for the API's largest page and stops at 1000 items by default", async () => {
    const readPage = endpoint(1_000_000);
    expect(await readAll(readPage)).toHaveLength(MAX_ITEMS);
    expect(readPage.mock.calls[0][0]).toEqual({ limit: PAGE_LIMIT, offset: 0 });
    expect([PAGE_LIMIT, MAX_ITEMS, readPage.mock.calls.length]).toEqual([200, 1000, 5]);
  });

  it.each([0, -5, 2.5, NaN, Infinity])("refuses a limit of %s before reading anything", async (limit) => {
    // An endpoint that tolerates such a limit answers an empty page, never "shorter than limit": the reading would not end.
    const readPage = vi.fn().mockResolvedValue([]);
    await expect(readAll(readPage, { limit })).rejects.toThrowError(RangeError);
    expect(readPage).not.toHaveBeenCalled();
  });

  it.each([Infinity, NaN])("refuses a cap of %s before reading anything", async (cap) => {
    const readPage = endpoint(1_000_000);
    await expect(readAll(readPage, { limit: 3, cap })).rejects.toThrowError(RangeError);
    expect(readPage).not.toHaveBeenCalled();
  });

  it("reads nothing for a cap of 0", async () => {
    const readPage = endpoint(10);
    expect(await readAll(readPage, { limit: 3, cap: 0 })).toEqual([]);
    expect(readPage).not.toHaveBeenCalled();
  });

  it("lets a failed page fail the whole read", async () => {
    const readPage = vi.fn().mockResolvedValueOnce([1, 2, 3]).mockRejectedValueOnce(new Error("page 2 failed"));
    await expect(readAll(readPage, { limit: 3 })).rejects.toThrowError("page 2 failed");
  });
});
