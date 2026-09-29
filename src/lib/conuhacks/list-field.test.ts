import { describe, expect, it } from "vitest";
import { listIncludes, parseListField } from "./list-field";

describe("parseListField", () => {
  it.each([
    ['["english","french"]', ["english", "french"]],
    [['["english","other"]'], ["english", "other"]],
    [["english", "french"], ["english", "french"]],
    ["english", ["english"]],
    ["", []],
    ["[]", []],
    [[], []],
    [null, []],
    [undefined, []],
    ["[not json", []],
    ['[1,"a"]', ["a"]],
  ])("%j → %j", (input, expected) => {
    expect(parseListField(input)).toEqual(expected);
  });

  it("listIncludes reads the same shapes", () => {
    expect(listIncludes(['["vegan","other"]'], "other")).toBe(true);
    expect(listIncludes('["vegan"]', "other")).toBe(false);
  });
});
