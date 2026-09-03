import assert from "node:assert/strict";
import test from "node:test";
import { wardrobeItemLabel } from "../lib/wardrobe/item-label";

test("wardrobe recommendation labels include the brand when available", () => {
  assert.equal(
    wardrobeItemLabel({ designer: "Sea New York", item_name: "Embroidered cotton blouse", category: "Shirts / Tees" }),
    "Sea New York — Embroidered cotton blouse",
  );
  assert.equal(
    wardrobeItemLabel({ designer: "Chanel", item_name: "Chanel slingback pumps", category: "Shoes" }),
    "Chanel slingback pumps",
  );
  assert.equal(
    wardrobeItemLabel({ designer: null, item_name: "Black utility shorts", category: "Shorts" }),
    "Black utility shorts",
  );
});
