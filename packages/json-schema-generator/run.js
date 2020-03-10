let fs = require("fs");
let JsonStreamStringify = require("json-stream-stringify");
let schema = require("@atlaskit/adf-schema/json-schema/v1/full.json");
let generator = require("./index");

console.log("Generating documents...");
let adf = generator(schema, {
  object: objects => {
    // Splitting doc by top level content
    if (objects && objects[0] && objects[0].type === "doc") {
      return objects.reduce((acc, obj) => {
        if (obj.content.length) {
          for (let content of obj.content) {
            acc.push({ ...obj, content: [content] });
          }
        } else {
          acc.push(obj);
        }
        return acc;
      }, []);
    }

    // Removing nodes with unsupported by this generator json schema features
    if (
      objects &&
      objects[0] &&
      [
        "subsup",
        "textColor",
        "bulletList",
        "orderedList",
        "taskItem",
        "taskList"
      ].includes(objects[0].type)
    ) {
      return [];
    }

    // For some pick random variation
    if (
      objects &&
      objects[0] &&
      [
        "bodiedExtension",
        "expand",
        "layoutSection",
        // -----
        "link",
        "inlineComment",
        "layoutColumn",
        "tableHeader",
        "mediaSingle",
        "tableCell",
        "table",
        "status",
        "mention"
      ].includes(objects[0].type)
    ) {
      return [objects[Math.floor(Math.random() * objects.length)]];
    }

    return objects;
  }
});

console.log("Stringifying docs...");
for (let i = 0; i < adf.length; i++) {
  let doc = adf[i];
  let jsonStream = new JsonStreamStringify(doc);
  jsonStream.pipe(fs.createWriteStream(`./docs/doc-${i}.json`));
}
