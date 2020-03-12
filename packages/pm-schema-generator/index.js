const ProsemirrorModel = require("prosemirror-model");

//#region Marks
let builtMarks;
const buildMarks = (schema, opts) => {
  // if (builtMarks) return builtMarks;
  const markSet = [];
  const excludedMarkSet = [];
  const combinationMarkSet = [];

  const marks = Object.keys(schema.marks);

  for (let i = 0; i < marks.length; i++) {
    const mark = schema.marks[marks[i]];
    const combinations = opts.attrCombinations(mark);
    if (combinations) {
      for (let k = 0; k < combinations.length; k++) {
        const attrs = combinations[k];
        combinationMarkSet.push([mark.create(attrs)]);
      }
      continue;
    }

    let excluded = false;
    for (let j = 0; j < marks.length; j++) {
      const comparisonMark = schema.marks[marks[j]];
      if (mark.excludes(comparisonMark) && mark !== comparisonMark) {
        excluded = true;
      }
    }

    if (excluded) {
      excludedMarkSet.push([mark.create(generateAttrs(mark, opts))]);
    } else {
      markSet.push(mark.create(generateAttrs(mark, opts)));
    }
  }

  builtMarks = [markSet, ...excludedMarkSet, ...combinationMarkSet];

  return builtMarks;
};

const validateMarkSetsForNode = (nodeType, schema, opts) => {
  const markSets = buildMarks(schema, opts);
  const filteredSet = [];
  for (let i = 0; i < markSets.length; i++) {
    const set = [...markSets[i]];
    const validSet = opts.customNodeAllowsMark(
      nodeType,
      nodeType.allowedMarks(set)
    );
    if (validSet && validSet.length) {
      filteredSet.push(validSet);
    }
  }
  return filteredSet.filter(x => !!x);
};
//#endregion

//#region Attributes
const generateAttrs = (type, opts) => {
  const attrs = type && type.spec && type.spec.attrs;

  if (!attrs) {
    return null;
  }

  return Object.keys(attrs).reduce((acc, current) => {
    acc[current] = opts.attrMap(type, current) || attrs[current].default;
    return acc;
  }, {});
};
//#endregion

//#region Helpers
const getChildNodes = (nodeMatch, nodes) => {
  const childNodes = [];

  Object.keys(nodes).forEach(nodeKey => {
    const node = nodes[nodeKey];
    if (nodeMatch.contentMatch.matchType(node)) {
      childNodes.push(node);
    }
  });

  return childNodes;
};
//#endregion

//#region Generation
const buildChildren = (children, schema, markSet, opts) => {
  let builtChildren = ProsemirrorModel.Fragment.empty;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const result = generateChildNodes(child, schema, markSet, opts);
    builtChildren = builtChildren.append(
      ProsemirrorModel.Fragment.from(result)
    );
  }

  return builtChildren;
};

const generateChildNodes = (nodeType, schema, marks, opts) => {
  if (nodeType.isText) {
    return schema.text(
      opts.attrMap(nodeType, "textContent") || "filler text",
      marks
    );
  }

  const childNodes = getChildNodes(nodeType, schema.nodes).filter(
    opts.filterNodes
  );
  let children = ProsemirrorModel.Fragment.empty;

  if (childNodes.length) {
    const allowedMarkSets = validateMarkSetsForNode(nodeType, schema, opts);
    if (allowedMarkSets.length) {
      for (let i = 0; i < allowedMarkSets.length; i++) {
        const markSet = allowedMarkSets[i] || [];

        children = children.append(
          buildChildren(childNodes, schema, markSet, opts)
        );
      }
    } else {
      children = children.append(buildChildren(childNodes, schema, [], opts));
    }
  }

  const combinations = opts.attrCombinations(nodeType);
  if (combinations) {
    return ProsemirrorModel.Fragment.fromArray(
      combinations.map(combination => {
        return nodeType.createChecked(
          combination,
          children,
          opts.customNodeAllowsMark(nodeType, marks)
        );
      })
    );
  }

  const node = nodeType.createAndFill(
    generateAttrs(nodeType, opts),
    children,
    opts.customNodeAllowsMark(nodeType, marks)
  );

  if (!nodeType.validContent(node.content)) {
    throw new Error("Invalid content for node " + nodeType.name);
  }

  return node;
};
//#endregion

const defaultOpts = {
  filterNodes: () => true,
  attrMap: () => {},
  attrCombinations: () => {},
  customNodeAllowsMark: (_node, marks = []) => marks
};

module.exports = {
  generate: function(schema, opts) {
    buildMarks(schema, opts);
    return generateChildNodes(schema.nodes.doc, schema, [], {
      ...defaultOpts,
      ...opts
    });
  }
};
