let test = require("ava");
let Ajv = require("ajv");
let betterAjvErrors = require("better-ajv-errors");
let generator = require("./index");

let ajv = new Ajv({ jsonPointers: true });

let testValidate = (title, only = false) => (
  schema,
  extra = () => {},
  visitors = {}
) => {
  (only ? test.only : test)(title, t => {
    let validate = ajv.compile(schema);
    let docs = generator(schema, visitors);
    let isValid = true;

    for (let doc of docs) {
      let valid = validate(doc);

      isValid = valid;
      if (!isValid) {
        // console.log(validate.errors);
        // console.log(JSON.stringify(doc, null, 2));
        console.log("Invalid");
        let output = betterAjvErrors(schema, doc, validate.errors);
        console.log(output);
      }
    }

    t.is(isValid, true);
    extra(t, docs);
  });
};
testValidate.only = title => testValidate(title, true);

testValidate("should support simple array")(
  {
    $defs: {},
    type: "array",
    items: { type: "number" }
  },
  (t, docs) => {
    t.is(docs.length, 2);
  }
);

testValidate("should support simple array with minItems")(
  {
    $defs: {},
    type: "array",
    minItems: 10,
    items: { type: "number" }
  },
  (t, docs) => {
    t.is(docs.length, 1);
    t.is(docs[0].length >= 10, true);
  }
);

testValidate("should support array oneOf")(
  {
    $defs: {},
    type: "array",
    items: {
      oneOf: [{ type: "number" }, { type: "string" }, { type: "boolean" }]
    }
  },
  (t, docs) => {
    t.is(docs.length, 4);
  }
);

testValidate("should support array oneOf with nested oneOf")(
  {
    $defs: {},
    type: "array",
    items: {
      oneOf: [
        { type: "number" },
        { type: "string" },
        { type: "boolean" },
        {
          oneOf: [{ type: "null" }]
        }
      ]
    }
  },
  (t, docs) => {
    t.is(docs.length, 5);
  }
);

testValidate("should support array oneOf with min/max")(
  {
    $defs: {},
    type: "array",
    minItems: 2,
    maxItems: 3,
    items: {
      oneOf: [{ type: "number" }, { type: "string" }, { type: "boolean" }]
    }
  },
  (t, docs) => {
    t.is(docs.length, 3);
  }
);

testValidate("should support array anyOf")(
  {
    $defs: {},
    type: "array",
    items: {
      anyOf: [{ type: "number" }, { type: "string" }, { type: "boolean" }]
    }
  },
  (t, docs) => {
    t.is(docs.length, 2);
  }
);

testValidate("should support array anyOf with min/max")(
  {
    $defs: {},
    type: "array",
    minItems: 2,
    maxItems: 2,
    items: {
      anyOf: [{ type: "number" }, { type: "string" }, { type: "boolean" }]
    }
  },
  (t, docs) => {
    t.is(docs.length, 2);
  }
);

testValidate("should support array anyOf with min/max 1")(
  {
    $defs: {},
    type: "array",
    maxItems: 1,
    items: {
      anyOf: [{ type: "number" }, { type: "string" }, { type: "boolean" }]
    }
  },
  (t, docs) => {
    t.is(docs.length, 4);
  }
);

testValidate("should support array anyOf with nested anyOf")(
  {
    $defs: {},
    type: "array",
    maxItems: 2,
    items: {
      anyOf: [
        { type: "number" },
        { type: "string" },
        { anyOf: [{ type: "boolean" }, { type: "string" }, { type: "null" }] }
      ]
    }
  },
  (t, docs) => {
    t.is(docs.length, 5);
  }
);

testValidate("should support simple objects")(
  {
    $defs: {},
    type: "object",
    properties: {
      z: { type: "number" },
      y: { type: "number" }
    },
    additionalProperties: false,
    required: ["z"]
  },
  (t, docs) => {
    t.is(docs.length, 2);
  }
);

testValidate("should support objects with multiple required values")(
  {
    type: "object",
    properties: {
      type: {
        enum: ["mention"]
      },
      attrs: {
        type: "object",
        properties: {
          id: {
            type: "string"
          },
          text: {
            type: "string"
          },
          userType: {
            enum: ["DEFAULT", "SPECIAL", "APP"]
          },
          accessLevel: {
            type: "string"
          }
        },
        required: ["id"],
        additionalProperties: false
      }
    },
    required: ["type", "attrs"],
    additionalProperties: false
  },
  (t, docs) => {
    console.log(docs);
  }
);

testValidate("should support objects with anyOf attribute")(
  {
    $defs: {},
    type: "object",
    properties: {
      z: {
        anyOf: [
          {
            type: "object",
            properties: {
              y: { type: "number" }
            }
          },
          {
            type: "object",
            properties: {
              z: { type: "string" }
            }
          }
        ]
      },
      x: {
        type: "array",
        items: { type: "number" }
      }
    },
    additionalProperties: false,
    required: ["z"]
  },
  (t, docs) => {
    t.is(docs.length, 12);
  }
);

testValidate("should support arrays with allOf")(
  {
    $defs: {},
    type: "array",
    maxItems: 2,
    items: {
      allOf: [
        {
          type: "object",
          properties: {
            z: { type: "string" },
            y: { type: "number" }
          },
          required: ["z"]
        },
        {
          type: "object",
          properties: {
            c: { type: "boolean" }
          }
        },
        {
          anyOf: [
            {
              type: "object",
              properties: {
                x: { type: "string" }
              },
              required: ["x"]
            },
            {
              type: "object",
              properties: {
                a: { type: "number" },
                b: { type: "string" }
              },
              required: ["a"]
            }
          ]
        }
      ]
    }
  },
  (t, docs) => {
    t.is(docs.length, 7);
  }
);

testValidate("adf schema: simple")(
  {
    definitions: {
      doc_node: {
        type: "object",
        properties: {
          version: {
            enum: [1]
          },
          type: {
            enum: ["doc"]
          },
          content: {
            type: "array",
            items: {
              anyOf: [
                {
                  $ref: "#/definitions/paragraph_node"
                }
              ]
            }
          }
        },
        required: ["version", "type", "content"],
        additionalProperties: false
      },
      text_node: {
        type: "object",
        properties: {
          type: {
            enum: ["text"]
          },
          text: {
            type: "string",
            minLength: 1
          },
          marks: {
            type: "array"
          }
        },
        required: ["type", "text"],
        additionalProperties: false
      },
      paragraph_node: {
        type: "object",
        properties: {
          type: {
            enum: ["paragraph"]
          },
          content: {
            type: "array",
            items: {
              $ref: "#/definitions/text_node"
            }
          },
          marks: {
            type: "array"
          }
        },
        required: ["type"],
        additionalProperties: false
      }
    },
    $ref: "#/definitions/doc_node"
  },
  (t, docs) => {
    t.is(docs.length, 2);
  }
);

testValidate("adf schema: simple with marks")(
  {
    description: "Schema for Atlassian Document Format.",
    definitions: {
      doc_node: {
        type: "object",
        properties: {
          version: {
            enum: [1]
          },
          type: {
            enum: ["doc"]
          },
          content: {
            type: "array",
            items: {
              anyOf: [
                {
                  $ref: "#/definitions/paragraph_node"
                }
              ]
            }
          }
        },
        required: ["version", "type", "content"],
        additionalProperties: false
      },
      text_node: {
        type: "object",
        properties: {
          type: {
            enum: ["text"]
          },
          text: {
            type: "string",
            minLength: 1
          },
          marks: {
            type: "array"
          }
        },
        required: ["type", "text"],
        additionalProperties: false
      },
      em_mark: {
        type: "object",
        properties: {
          type: {
            enum: ["em"]
          }
        },
        required: ["type"],
        additionalProperties: false
      },
      strike_mark: {
        type: "object",
        properties: {
          type: {
            enum: ["strike"]
          }
        },
        required: ["type"],
        additionalProperties: false
      },
      paragraph_node: {
        type: "object",
        properties: {
          type: {
            enum: ["paragraph"]
          },
          content: {
            type: "array",
            items: {
              allOf: [
                {
                  $ref: "#/definitions/text_node"
                },
                {
                  type: "object",
                  properties: {
                    marks: {
                      type: "array",
                      items: {
                        anyOf: [
                          {
                            $ref: "#/definitions/em_mark"
                          },
                          {
                            $ref: "#/definitions/strike_mark"
                          }
                        ]
                      }
                    }
                  },
                  additionalProperties: true
                }
              ]
            }
          },
          marks: {
            type: "array"
          }
        },
        required: ["type"],
        additionalProperties: false
      }
    },
    $ref: "#/definitions/doc_node"
  },
  (t, docs) => {
    t.is(docs.length, 2);
  }
);

testValidate("adf schema: complex")(
  {
    description: "Schema for Atlassian Document Format.",
    definitions: {
      doc_node: {
        type: "object",
        properties: {
          version: {
            enum: [1]
          },
          type: {
            enum: ["doc"]
          },
          content: {
            type: "array",
            items: {
              anyOf: [
                {
                  $ref: "#/definitions/paragraph_node"
                }
              ]
            }
          }
        },
        required: ["version", "type", "content"],
        additionalProperties: false
      },
      paragraph_node: {
        type: "object",
        properties: {
          type: {
            enum: ["paragraph"]
          },
          content: {
            type: "array",
            items: {
              $ref: "#/definitions/inline_node"
            }
          },
          marks: {
            type: "array"
          }
        },
        required: ["type"],
        additionalProperties: false
      },
      inline_node: {
        anyOf: [
          {
            $ref: "#/definitions/formatted_text_inline_node"
          }
        ]
      },
      formatted_text_inline_node: {
        allOf: [
          {
            $ref: "#/definitions/text_node"
          },
          {
            type: "object",
            properties: {
              marks: {
                type: "array",
                items: {
                  anyOf: [
                    {
                      $ref: "#/definitions/em_mark"
                    },
                    {
                      $ref: "#/definitions/strike_mark"
                    }
                  ]
                }
              }
            },
            additionalProperties: true
          }
        ]
      },
      text_node: {
        type: "object",
        properties: {
          type: {
            enum: ["text"]
          },
          text: {
            type: "string",
            minLength: 1
          },
          marks: {
            type: "array"
          }
        },
        required: ["type", "text"],
        additionalProperties: false
      },
      em_mark: {
        type: "object",
        properties: {
          type: {
            enum: ["em"]
          }
        },
        required: ["type"],
        additionalProperties: false
      },
      strike_mark: {
        type: "object",
        properties: {
          type: {
            enum: ["strike"]
          }
        },
        required: ["type"],
        additionalProperties: false
      }
    },
    $ref: "#/definitions/doc_node"
  },
  (t, docs) => {
    t.is(docs.length, 2);
  }
);

testValidate.only("adf schema: full")(
  require("@atlaskit/adf-schema/json-schema/v1/full.json"),
  (t, docs) => {
    console.log({ docs });
    t.is(docs.length, 2);
  },
  {
    object: objects => {
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
          "taskList",
          "bodiedExtension", // ?
          "expand", // ?
          "layoutSection" // ?
        ].includes(objects[0].type)
      ) {
        return [];
      }
      return objects;
    }
  }
);
