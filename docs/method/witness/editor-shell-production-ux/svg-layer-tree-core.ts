import { buildSvgLayerTree, SvgLayerRow, SvgLayerTree } from "../../../../frontend/src/SvgLayerTree";

const assert = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const assertThrows = (operation: () => void, message: string): void => {
  let threw = false;
  try {
    operation();
  } catch (error) {
    threw = error instanceof Error;
  }
  assert(threw, message);
};

assertThrows(
  () => {
    new SvgLayerRow("", "", "Missing Target", "group", 0);
  },
  "empty target ID did not throw",
);

assertThrows(
  () => {
    new SvgLayerRow("box", "", "", "shape", 0);
  },
  "empty layer label did not throw",
);

assertThrows(
  () => {
    new SvgLayerRow("box", "", "Box", "shape", -1);
  },
  "negative layer depth did not throw",
);

const row = new SvgLayerRow("badge-box", "badge-group", "Badge Box", "shape", 2);
const tree = new SvgLayerTree([row]);

assert(Object.isFrozen(tree), "layer tree wrapper was not frozen");
assert(Object.isFrozen(tree.rows), "layer tree rows were not frozen");
assert(tree.rows[0] === row, "layer tree did not preserve row instance");
assert(row.matches("badge"), "row did not match label query");
assert(row.matches("group"), "row did not match parent query");
assert(row.matches("shape"), "row did not match kind query");

const nodeTree = buildSvgLayerTree("<svg id=\"root\" xmlns=\"http://www.w3.org/2000/svg\" />");
assert(nodeTree.rows.length === 0, "Node core witness unexpectedly parsed SVG without DOMParser");

console.log("svg layer tree core witness passed");
