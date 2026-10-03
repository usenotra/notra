import assert from "node:assert/strict";
import { test } from "node:test";

import { getPageNumbers } from "./get-page-numbers";

test("pagination keeps first and last page with a compact leading window", () => {
  for (const total of [8, 17, 100]) {
    for (let current = 1; current <= total; current++) {
      const pages = getPageNumbers(current, total);
      const numbers = pages.filter((page): page is number =>
        typeof page === "number"
      );

      assert.ok(pages.length === 5 || pages.length === 7);
      assert.equal(numbers[0], 1);
      assert.equal(numbers.at(-1), total);
      assert.ok(numbers.includes(current));
      assert.deepEqual(numbers, [...numbers].sort((a, b) => a - b));
    }
  }

  assert.deepEqual(getPageNumbers(1, 17), [1, 2, 3, "ellipsis", 17]);
  assert.deepEqual(getPageNumbers(7, 26), [
    1,
    "ellipsis",
    6,
    7,
    8,
    "ellipsis",
    26,
  ]);
  assert.deepEqual(getPageNumbers(9, 17), [
    1,
    "ellipsis",
    8,
    9,
    10,
    "ellipsis",
    17,
  ]);
  assert.deepEqual(getPageNumbers(23, 26), [
    1,
    "ellipsis",
    22,
    23,
    24,
    25,
    26,
  ]);
  assert.deepEqual(getPageNumbers(17, 17), [
    1,
    "ellipsis",
    13,
    14,
    15,
    16,
    17,
  ]);
  assert.deepEqual(getPageNumbers(3, 6), [1, 2, 3, 4, 5, 6]);
});
