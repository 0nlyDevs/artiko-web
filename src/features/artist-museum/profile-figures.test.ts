import { describe, expect, it } from "vitest";
import { profileFigures } from "./profile-figures";

const work = (votes: number, human_proven: boolean) => ({ votes, human_proven });

describe("profileFigures", () => {
  it("counts the works, their votes and the proven ones when the list is whole", () => {
    expect(profileFigures([work(14, true), work(4, true), work(0, false)], true)).toEqual({ works: 3, votes: 18, proven: 2 });
  });

  it("counts an artist without works as zero, not as unknown", () => {
    expect(profileFigures([], true)).toEqual({ works: 0, votes: 0, proven: 0 });
  });

  it("gives no figure at all when the list was cut: a count on a part of it would be wrong", () => {
    expect(profileFigures([work(14, true), work(4, false)], false)).toBeNull();
  });
});
