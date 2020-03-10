module.exports = (schema, visitors = {}) => {
  if (!schema) {
    throw new Error(
      "Schema must be provided!, Got + " + typeof schema + "instead"
    );
  }

  let definitions = getDefinitions(schema);

  return expandType(schema, definitions, visitors);
};

function expandType(maybeRef, definitions, visitors) {
  let type = maybeRef.$ref
    ? getDefinitionFromRef(maybeRef.$ref, definitions)
    : maybeRef;
  let refName = getRefName(maybeRef.$ref);
  let typeName = type.type
    ? type.type
    : type.oneOf
    ? "oneOf"
    : type.anyOf
    ? "anyOf"
    : type.allOf
    ? "allOf"
    : type.enum
    ? "enum"
    : isEmptyObject(type)
    ? "emptyObject"
    : undefined;

  let expandedType;
  switch (typeName) {
    case "number":
      expandedType = expandNumber(type, definitions, visitors);
      break;

    case "string":
      expandedType = expandString(type, definitions, visitors);
      break;

    case "boolean":
      expandedType = expandBoolean(type, definitions, visitors);
      break;

    case "enum":
      expandedType = type.enum;
      break;

    case "emptyObject":
      expandedType = {};
      break;

    case "null":
      expandedType = null;
      break;

    case "array":
      expandedType = expandArray(type, definitions, visitors);
      break;

    case "object":
      expandedType = expandObject(type, definitions, visitors);
      break;

    case "oneOf":
      expandedType = expandOneOf(type, definitions, visitors);
      break;

    case "anyOf":
      expandedType = expandAnyOf(type, definitions, visitors);
      break;

    case "allOf":
      expandedType = expandAllOf(type, definitions, visitors);
      break;

    default:
      throw new Error("Unknown type: " + typeName + " " + JSON.stringify(type));
  }

  return expandedType;
}

//#region Array
function expandArray(type, definitions, visitors) {
  if (!type.items) return [];

  if (Array.isArray(type.items)) {
    return expandArrayWithArrayOfItems(type, definitions, visitors);
  }

  let possibleItems = asArray(expandType(type.items, definitions, visitors));
  let maxPossibleItems = possibleItems.length;

  if (isNestedArray(possibleItems)) {
    maxPossibleItems = getBiggestNestedArraySize(possibleItems);
  }

  let min = type.minItems || 0;
  let max = type.maxItems || Math.max(maxPossibleItems, min, 1);
  let arrays = [];

  if (min === 0) {
    arrays.push([]);
  }

  if (isNestedArray(possibleItems)) {
    for (let items of possibleItems) {
      arrays.push(...capArrayByPossibleMaxValue(items, max, min));
    }
  } else {
    arrays.push(...capArrayByPossibleMaxValue(possibleItems, max, min));
  }

  return arrays;
}

function expandArrayWithArrayOfItems(type, definitions, visitors) {
  // TODO: support array with array of items
  return [[]];
}

function capArrayByPossibleMaxValue(possibleValues, max, min = 0) {
  let resultArrays = [];
  let cur = 0;
  let curArr = [];
  let carryOnMax = max;
  let fullCycle = false;

  if (!possibleValues.length) {
    return [];
  }

  if (possibleValues.length <= max) {
    resultArrays = [possibleValues];
  } else {
    while (carryOnMax >= 0 || !fullCycle) {
      if (
        (cur % possibleValues.length === 0 && cur > 0) ||
        possibleValues.length === 1
      ) {
        fullCycle = true;
      }

      if (curArr.length === max) {
        resultArrays.push(curArr);
        curArr = [];
      } else {
        curArr.push(possibleValues[cur % possibleValues.length]);
        carryOnMax--;
        cur++;
      }
    }
  }

  if (curArr.length === max) {
    resultArrays.push(curArr);
  }

  for (let i = 0; i < resultArrays.length; i++) {
    if (resultArrays[i].length < min) {
      while (resultArrays[i].length < min) {
        resultArrays[i] = resultArrays[i].concat(resultArrays[i]);
      }
      resultArrays[i] = resultArrays[i].slice(0, min + 1);
    }
  }

  return resultArrays;
}
//#endregion

//#region Objects
function expandObject(type, definitions, visitors) {
  let required = type.required || [];
  let optional = Object.keys(type.properties).filter(
    prop => required.indexOf(prop) === -1
  );
  let objects = [{}];

  for (let prop of required) {
    let values = asArray(type.properties[prop]).flatMap(value =>
      expandType(value, definitions, visitors)
    );

    if (type.properties[prop].anyOf) {
      values = values.flat();
    }

    let extraObjects = [];
    for (let obj of objects) {
      for (let val of values) {
        if (obj.hasOwnProperty(prop)) {
          extraObjects.push({ ...obj, [prop]: val });
        } else {
          obj[prop] = val;
        }
      }
    }
    objects.push(...extraObjects);
  }

  for (let prop of optional) {
    let values = asArray(type.properties[prop]).flatMap(value =>
      expandType(value, definitions, visitors)
    );

    if (type.properties[prop].anyOf) {
      values = values.flat();
    }

    let extraObjects = [];
    for (let obj of objects) {
      for (let val of values) {
        extraObjects.push({ ...obj, [prop]: val });
      }
    }
    objects.push(...extraObjects);
  }

  if (visitors.object) {
    return visitors.object(objects);
  }

  if (
    objects[0] &&
    [
      "blockCard",
      "bodiedExtension",
      "bulletList",
      "codeBlock",
      "date",
      "decisionItem",
      "emoji",
      "expand",
      "expand",
      "extension",
      "heading",
      "inlineCard",
      "inlineComment",
      "inlineExtension",
      "layoutColumn",
      "layoutSection",
      "link",
      "listItem",
      "media",
      "mediaGroup",
      "mediaSingle",
      "mention",
      "nestedExpand",
      "orderedList",
      "panel",
      "paragraph",
      "status",
      "status",
      "tableCell"
      // "tableHeader"
      // "tableRow"
      // "taskList"
    ].includes(objects[0].type)
  ) {
    return [objects[0]];
  }

  for (let obj of objects) {
    if (["tableHeader"].includes(obj.type)) {
      obj.content = [];
    }
  }

  return objects;
}
//#endregion

//#region Primitive Types
function expandNumber(type, definitions, visitors) {
  let min = type.minimum || 0;
  let max = type.maximum || 100;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function expandString(type, definitions, visitors) {
  return "string";
}

function expandBoolean(type, definitions, visitors) {
  return Math.random() > 0.5 ? true : false;
}
//#endregion

//#region oneOf / anyOf / allOf
function expandOneOf(type, definitions, visitors) {
  return type.oneOf.reduce((acc, subtype) => {
    let expandedType = asArray(expandType(subtype, definitions, visitors));
    if (isNestedArray(expandedType)) {
      acc.push(...expandedType);
    } else {
      acc.push(expandedType);
    }
    return acc;
  }, []);
}

function expandAnyOf(type, definitions, visitors) {
  let possibleItems = type.anyOf.map(subtype =>
    asArray(expandType(subtype, definitions, visitors))
  );

  let simpleItems = possibleItems.filter(item => !isNestedArray(item)).flat();
  let complexItems = possibleItems.filter(item => isNestedArray(item)).flat();
  let arrays = [[], simpleItems];

  for (let item of complexItems) {
    if (item.length) {
      arrays.push([...simpleItems, ...item]);
    }
  }

  return arrays;
}

function expandAllOf(type, definitions, visitors) {
  let possibleItems = type.allOf.map(subtype =>
    asArray(expandType(subtype, definitions, visitors))
  );
  let simpleItems = possibleItems.filter(item => !isNestedArray(item));
  let complexItems = possibleItems.filter(item => isNestedArray(item)).flat();

  // Don't have a base object, though need to add support for base being the first from complex
  if (!simpleItems.length) return [];

  let objects = simpleItems.shift();
  for (let objectList of [...simpleItems, ...complexItems]) {
    let extendedObjects = [];
    for (let obj of objects) {
      for (let item of objectList) {
        extendedObjects.push({ ...obj, ...item });
      }
    }
    if (extendedObjects.length) {
      objects = extendedObjects;
    }
  }

  return objects;
}
//#endregion

//#region Definitions and Refs
function getDefinitions(schema) {
  return schema.$defs || schema.definitions;
}

function getRefName(ref) {
  if (!ref) return;
  return ref.split("/").slice(2)[0];
}

function getDefinitionFromRef(ref, definition) {
  return definition[getRefName(ref)];
}
//#endregion

//#region Utils
function asArray(item) {
  return Array.isArray(item) ? item : [item];
}

function isNestedArray(item) {
  return Array.isArray(item) && item.length && Array.isArray(item[0]);
}

function getBiggestNestedArraySize(arrays) {
  return arrays.reduce(
    (size, arr) => (size > arr.length ? size : arr.length),
    0
  );
}

function isObject(obj) {
  return typeof obj === "object" && obj !== null;
}

function isEmptyObject(obj) {
  return isObject(obj) && Object.keys(obj).length === 0;
}
//#endregion
