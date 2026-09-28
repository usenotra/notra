import assert from "node:assert/strict";
import { test } from "node:test";

import { getPageNumbers } from "./get-page-numbers";

test("pagination keeps five slots while moving through longer result sets", () => {
  for (const total of [6, 17, 100]) {
    for (let current = 1; current <= total; current++) {
      const pages = getPageNumbers(current, total);
      const numbers = pages.filter((page): page is number =>
        typeof page === "number"
      );

      assert.equal(pages.length, 5);
      assert.equal(numbers.at(-1), total);
      assert.ok(numbers.includes(current));
      assert.deepEqual(numbers, [...numbers].sort((a, b) => a - b));
    }
  }

  assert.deepEqual(getPageNumbers(1, 17), [1, 2, 3, "ellipsis", 17]);
  assert.deepEqual(getPageNumbers(7, 26), [6, 7, 8, "ellipsis", 26]);
  assert.deepEqual(getPageNumbers(9, 17), [8, 9, 10, "ellipsis", 17]);
  assert.deepEqual(getPageNumbers(23, 26), [22, 23, 24, 25, 26]);
  assert.deepEqual(getPageNumbers(17, 17), [13, 14, 15, 16, 17]);
  assert.deepEqual(getPageNumbers(3, 5), [1, 2, 3, 4, 5]);
});
