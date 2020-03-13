const adfSchema = require("@atlaskit/adf-schema");
const faker = require("faker");
const { generate } = require("./index");

const test = require("ava");
const fs = require("fs");

let outputCounter = 1;
const saveOutput = data => {
  fs.writeFileSync(__dirname + `/scenario${outputCounter}.json`, data, {
    encoding: "utf8"
  });
  console.log(`Saved Scenario ${outputCounter} output`);
  outputCounter++;
};

const opts = {
  filterNodes: nodeType =>
    ["image", "unknownBlock"].indexOf(nodeType.name) === -1,
  attrMap: (type, key) => {
    // Consistent seeding for our random data
    faker.seed(1);
    switch (key) {
      case "url":
      case "href":
        return faker.internet.url();
      case "color":
        return faker.internet.color();
      case "text":
        return faker.lorem.words(2);
      case "width":
      case "height":
        return faker.random.number();
      case "uniqueId":
      case "localId":
        return faker.random.uuid();
      case "textContent":
        return "Quisquam recusandae alias consequuntur corporis repellat ratione ut sunt qui."; //faker.lorem.text();
    }
  },
  attrCombinations: type => {
    switch (type.name) {
      case "panel":
        return [
          { panelType: "info" },
          { panelType: "note" },
          { panelType: "tip" },
          { panelType: "warning" },
          { panelType: "success" },
          { panelType: "error" }
        ];
      case "subsup":
        return [{ type: "sub" }, { type: "sup" }];
      case "alignment":
        return [{ align: "center" }, { align: "end" }];
      case "indentation":
        return Array.from({ length: 6 }, (_v, i) => ({ level: i + 1 }));
      case "breakout":
        return [{ mode: "default" }, { mode: "wide" }, { mode: "full-width" }];
    }
  },
  customNodeAllowsMark: (nodeType, marks = []) => {
    switch (nodeType.name) {
      case "panel":
      case "bulletList":
      case "orderedList":
      case "codeBlock":
      case "layoutSection":
      case "table":
        return [];
      default:
        return marks;
    }
  }
};

const createSchema = (nodes = [], marks = []) => {
  return adfSchema.createSchema({ nodes: ["doc", "text", ...nodes], marks });
};

function macro(t, input) {
  const schema = createSchema(input.nodes || [], input.marks || []);
  const tree = generate(schema, opts);
  saveOutput(JSON.stringify(tree, null, 2));
  t.snapshot(tree.toJSON());
}

const marks = [
  "link",
  "em",
  "strong",
  "strike",
  "subsup",
  "underline",
  "code",
  "textColor",
  "breakout",
  "alignment",
  "indentation",
  "annotation"
];

test("Scenario 1", macro, {
  nodes: ["paragraph"],
  marks
});
test("Scenario 2", macro, {
  nodes: ["paragraph", "panel"],
  marks
});
test("Scenario 3", macro, {
  nodes: ["paragraph", "panel", "layoutSection", "layoutColumn"],
  marks
});
test("Scenario 4", macro, {
  nodes: [
    "paragraph",
    "panel",
    "layoutSection",
    "layoutColumn",
    "bulletList",
    "orderedList",
    "listItem",
    "codeBlock"
  ],
  marks
});

test("Scenario 5", macro, {
  nodes: [
    "paragraph",
    "panel",
    "layoutSection",
    "layoutColumn",
    "bulletList",
    "orderedList",
    "listItem",
    "codeBlock",
    "table",
    "tableCell",
    "tableHeader",
    "tableRow"
  ],
  marks
});
