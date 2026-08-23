/** @typedef {import("acorn").Node} Node */
/** @typedef {import("acorn").CallExpression} CallExpression */
/** @typedef {import("acorn").ExpressionStatement} ExpressionStatement */
/** @typedef {import("acorn").Expression} Expression */
/** @typedef {import("acorn").SpreadElement} SpreadElement */

const fs = require("node:fs");
const acorn = require("acorn");
const walk = require("acorn-walk");

/**
 * @param {Expression} node node
 * @returns {boolean} true when id is numeric, otherwise false
 */
function isNumericId(node) {
  return (
    node.type === "Literal" &&
    node.value !== null &&
    node.value !== undefined &&
    Number.isInteger(node.value) &&
    /** @type {number} */ (node.value) >= 0
  );
}

/**
 * @param {Expression | SpreadElement | null} node node
 * @returns {boolean} true when module id, otherwise false
 */
function isModuleId(node) {
  return (
    node !== null &&
    node.type === "Literal" &&
    (isNumericId(node) || typeof node.value === "string")
  );
}

/**
 * @param {Expression | SpreadElement} node node
 * @returns {boolean} true when module wrapper, otherwise false
 */
function isModuleWrapper(node) {
  return (
    // It's an anonymous function expression that wraps module
    ((node.type === "FunctionExpression" ||
      node.type === "ArrowFunctionExpression") &&
      !node.id) ||
    // If `DedupePlugin` is used it can be an ID of duplicated module...
    isModuleId(node) ||
    // or an array of shape [<module_id>, ...args]
    (node.type === "ArrayExpression" &&
      node.elements.length > 1 &&
      isModuleId(node.elements[0]))
  );
}

/**
 * @param {Expression | SpreadElement | null} node node
 * @returns {boolean} true when module hash, otherwise false
 */
function isModulesHash(node) {
  return (
    node !== null &&
    node.type === "ObjectExpression" &&
    node.properties
      .filter((property) => property.type !== "SpreadElement")
      .map((node) => node.value)
      .every(isModuleWrapper)
  );
}

/**
 * @param {Expression | SpreadElement | null} node node
 * @returns {boolean} true when module array, otherwise false
 */
function isModulesArray(node) {
  return (
    node !== null &&
    node.type === "ArrayExpression" &&
    node.elements.every(
      (elem) =>
        // Some of array items may be skipped because there is no module with such id
        !elem || isModuleWrapper(elem),
    )
  );
}

/**
 * @param {Expression | SpreadElement | null} node node
 * @returns {boolean} true when simple modules list, otherwise false
 */
function isSimpleModulesList(node) {
  return (
    // Modules are contained in hash. Keys are module ids.
    isModulesHash(node) ||
    // Modules are contained in array. Indexes are module ids.
    isModulesArray(node)
  );
}

/**
 * @param {Expression | SpreadElement | null} node node
 * @returns {boolean} true when optimized modules array, otherwise false
 */
function isOptimizedModulesArray(node) {
  // Checking whether modules are contained in `Array(<minimum ID>).concat(...modules)` array:
  // https://github.com/webpack/webpack/blob/v1.14.0/lib/Template.js#L91
  // The `<minimum ID>` + array indexes are module ids
  return (
    node !== null &&
    node.type === "CallExpression" &&
    node.callee.type === "MemberExpression" &&
    // Make sure the object called is `Array(<some number>)`
    node.callee.object.type === "CallExpression" &&
    node.callee.object.callee.type === "Identifier" &&
    node.callee.object.callee.name === "Array" &&
    node.callee.object.arguments.length === 1 &&
    node.callee.object.arguments[0].type !== "SpreadElement" &&
    isNumericId(node.callee.object.arguments[0]) &&
    // Make sure the property X called for `Array(<some number>).X` is `concat`
    node.callee.property.type === "Identifier" &&
    node.callee.property.name === "concat" &&
    // Make sure exactly one array is passed in to `concat`
    node.arguments.length === 1 &&
    isModulesArray(node.arguments[0])
  );
}

/**
 * @param {Expression | SpreadElement | null} node node
 * @returns {boolean} true when modules list, otherwise false
 */
function isModulesList(node) {
  return (
    isSimpleModulesList(node) ||
    // Modules are contained in expression `Array([minimum ID]).concat([<module>, <module>, ...])`
    isOptimizedModulesArray(node)
  );
}

/** @typedef {{ start: number, end: number }} Location */

/**
 * @param {Node} node node
 * @returns {Location} location
 */
function getModuleLocation(node) {
  return {
    start: node.start,
    end: node.end,
  };
}

/** @typedef {Record<number, Location>} ModulesLocations */
/** @typedef {{ locations: ModulesLocations, hasWebpackRuntime: boolean, isTopLevel: boolean }} Webpack5IIFECandidate */

/**
 * @param {Expression | SpreadElement} node node
 * @returns {ModulesLocations} modules locations
 */
function getModulesLocations(node) {
  if (node.type === "ObjectExpression") {
    // Modules hash
    const modulesNodes = node.properties;

    return modulesNodes.reduce((result, moduleNode) => {
      if (moduleNode.type !== "Property") {
        return result;
      }

      const moduleId =
        moduleNode.key.type === "Identifier"
          ? moduleNode.key.name
          : // @ts-expect-error need verify why we need it, tests not cover it case
            moduleNode.key.value;

      if (moduleId === "undefined") {
        return result;
      }

      result[moduleId] = getModuleLocation(moduleNode.value);

      return result;
    }, /** @type {ModulesLocations} */ ({}));
  }

  const isOptimizedArray = node.type === "CallExpression";

  if (node.type === "ArrayExpression" || isOptimizedArray) {
    // Modules array or optimized array
    const minId =
      isOptimizedArray &&
      node.callee.type === "MemberExpression" &&
      node.callee.object.type === "CallExpression" &&
      node.callee.object.arguments[0].type === "Literal"
        ? // Get the [minId] value from the Array() call first argument literal value
          /** @type {number} */ (node.callee.object.arguments[0].value)
        : // `0` for simple array
          0;
    const modulesNodes = isOptimizedArray
      ? // The modules reside in the `concat()` function call arguments
        node.arguments[0].type === "ArrayExpression"
        ? node.arguments[0].elements
        : []
      : node.elements;

    return modulesNodes.reduce((result, moduleNode, i) => {
      if (moduleNode) {
        result[i + minId] = getModuleLocation(moduleNode);
      }

      return result;
    }, /** @type {ModulesLocations} */ ({}));
  }

  return {};
}

/**
 * @param {ExpressionStatement} node node
 * @returns {CallExpression | null} IIFE call expression
 */
function getIIFECallExpression(node) {
  if (node.expression.type === "CallExpression") {
    return node.expression;
  }

  if (
    node.expression.type === "UnaryExpression" &&
    node.expression.argument.type === "CallExpression"
  ) {
    return node.expression.argument;
  }

  return null;
}

/**
 * @param {Node} node node
 * @param {string} modulesVariableName modules variable name
 * @returns {boolean} true when the node calls a module wrapper
 */
function callsModulesMap(node, modulesVariableName) {
  let callsModule = false;

  walk.simple(node, {
    CallExpression(callExpression) {
      const { callee } = callExpression;

      if (
        callee.type === "MemberExpression" &&
        ((callee.object.type === "Identifier" &&
          callee.object.name === modulesVariableName) ||
          (callee.object.type === "MemberExpression" &&
            callee.object.object.type === "Identifier" &&
            callee.object.object.name === modulesVariableName))
      ) {
        callsModule = true;
      }
    },
  });

  return callsModule;
}

/**
 * @param {import("acorn").BlockStatement} body body
 * @param {import("acorn").VariableDeclaration} modulesDeclaration modules declaration
 * @param {string} modulesVariableName modules variable name
 * @returns {boolean} true when the candidate contains Webpack module loading
 */
function hasWebpackModulesRuntime(
  body,
  modulesDeclaration,
  modulesVariableName,
) {
  const declarationIndex = body.body.indexOf(modulesDeclaration);

  return body.body
    .slice(declarationIndex + 1)
    .some((statement) => callsModulesMap(statement, modulesVariableName));
}

/**
 * @param {CallExpression} node node
 * @param {boolean} isTopLevel is top-level IIFE
 * @returns {Webpack5IIFECandidate | null} modules candidate
 */
function getWebpack5IIFEModulesCandidate(node, isTopLevel) {
  if (
    node.arguments.length !== 0 ||
    (node.callee.type !== "FunctionExpression" &&
      node.callee.type !== "ArrowFunctionExpression") ||
    node.callee.params.length !== 0 ||
    node.callee.body.type !== "BlockStatement"
  ) {
    return null;
  }

  const firstVariableDeclaration = node.callee.body.body.find(
    (node) => node.type === "VariableDeclaration",
  );

  if (firstVariableDeclaration) {
    for (const declaration of firstVariableDeclaration.declarations) {
      if (declaration.init && isModulesList(declaration.init)) {
        const locations = getModulesLocations(declaration.init);

        if (Object.keys(locations).length === 0) {
          continue;
        }

        return {
          locations,
          hasWebpackRuntime:
            declaration.id.type === "Identifier" &&
            hasWebpackModulesRuntime(
              node.callee.body,
              firstVariableDeclaration,
              declaration.id.name,
            ),
          isTopLevel,
        };
      }
    }
  }

  return null;
}

/**
 * @param {Webpack5IIFECandidate[]} candidates candidates
 * @returns {Webpack5IIFECandidate | null} selected candidate
 */
function selectWebpack5IIFECandidate(candidates) {
  return (
    candidates.find(
      (candidate) => candidate.hasWebpackRuntime && candidate.isTopLevel,
    ) ||
    candidates.find((candidate) => candidate.hasWebpackRuntime) ||
    candidates.find((candidate) => candidate.isTopLevel) ||
    null
  );
}

/**
 * @param {Webpack5IIFECandidate[]} candidates candidates
 * @param {(string | number)[] | undefined} expectedModuleIds expected module ids
 * @returns {ModulesLocations | null} selected modules locations
 */
function selectWebpack5IIFEModulesLocations(candidates, expectedModuleIds) {
  if (candidates.length === 0) {
    return null;
  }

  if (expectedModuleIds?.length) {
    const expectedIds = new Set(expectedModuleIds.map(String));
    const rankedCandidates = candidates
      .map((candidate) => ({
        candidate,
        expectedIdsIntersection: Object.keys(candidate.locations).filter(
          (moduleId) => expectedIds.has(moduleId),
        ).length,
      }))
      .toSorted(
        (candidateA, candidateB) =>
          candidateB.expectedIdsIntersection -
          candidateA.expectedIdsIntersection,
      );

    if (rankedCandidates[0].expectedIdsIntersection > 0) {
      const bestCandidates = rankedCandidates
        .filter(
          (rankedCandidate) =>
            rankedCandidate.expectedIdsIntersection ===
            rankedCandidates[0].expectedIdsIntersection,
        )
        .map((rankedCandidate) => rankedCandidate.candidate);

      return selectWebpack5IIFECandidate(bestCandidates)?.locations || null;
    }
  }

  return selectWebpack5IIFECandidate(candidates)?.locations || null;
}

/**
 * @param {Expression} node node
 * @returns {boolean} true when chunks ids, otherwose false
 */
function isChunkIds(node) {
  // Array of numeric or string ids. Chunk IDs are strings when NamedChunksPlugin is used
  return node.type === "ArrayExpression" && node.elements.every(isModuleId);
}

/**
 * @param {(Expression | SpreadElement | null)[]} args arguments
 * @returns {boolean} true when async chunk arguments, otherwise false
 */
function mayBeAsyncChunkArguments(args) {
  return (
    args.length >= 2 &&
    args[0] !== null &&
    args[0].type !== "SpreadElement" &&
    isChunkIds(args[0])
  );
}

/**
 * Returns bundle source except modules
 * @param {string} content content
 * @param {ModulesLocations | null} modulesLocations modules locations
 * @returns {string} runtime code
 */
function getBundleRuntime(content, modulesLocations) {
  const sortedLocations = Object.values(modulesLocations || {}).toSorted(
    (a, b) => a.start - b.start,
  );

  let result = "";
  let lastIndex = 0;

  for (const { start, end } of sortedLocations) {
    result += content.slice(lastIndex, start);
    lastIndex = end;
  }

  return result + content.slice(lastIndex);
}

/**
 * @param {CallExpression} node node
 * @returns {boolean} true when is async chunk push expression, otheriwse false
 */
function isAsyncChunkPushExpression(node) {
  const { callee, arguments: args } = node;

  return (
    callee.type === "MemberExpression" &&
    callee.property.type === "Identifier" &&
    callee.property.name === "push" &&
    callee.object.type === "AssignmentExpression" &&
    args.length === 1 &&
    args[0].type === "ArrayExpression" &&
    mayBeAsyncChunkArguments(args[0].elements) &&
    isModulesList(args[0].elements[1])
  );
}

/**
 * @param {CallExpression} node node
 * @returns {boolean} true when is async web worker, otherwise false
 */
function isAsyncWebWorkerChunkExpression(node) {
  const { callee, type, arguments: args } = node;

  return (
    type === "CallExpression" &&
    callee.type === "MemberExpression" &&
    args.length === 2 &&
    args[0].type !== "SpreadElement" &&
    isChunkIds(args[0]) &&
    isModulesList(args[1])
  );
}

/** @typedef {Record<string, string>} Modules */

/**
 * @param {string} bundlePath bundle path
 * @param {{ sourceType?: "script" | "module", expectedModuleIds?: (string | number)[] }} opts options
 * @returns {{ modules: Modules, src: string, runtimeSrc: string }} parsed result
 */
module.exports.parseBundle = function parseBundle(bundlePath, opts) {
  const { sourceType = "script", expectedModuleIds } = opts || {};

  const content = fs.readFileSync(bundlePath, "utf8");
  const ast = acorn.parse(content, {
    sourceType,
    ecmaVersion: "latest",
  });

  /** @type {Set<CallExpression>} */
  const topLevelIIFECalls = new Set();

  for (const node of ast.body) {
    if (node.type === "ExpressionStatement") {
      const iifeCall = getIIFECallExpression(node);

      if (iifeCall) {
        topLevelIIFECalls.add(iifeCall);
      }
    }
  }

  /** @type {{ locations: ModulesLocations | null, webpack5IIFECandidates: Webpack5IIFECandidate[] }} */
  const walkState = {
    locations: null,
    webpack5IIFECandidates: [],
  };

  walk.recursive(ast, walkState, {
    AssignmentExpression(node, state) {
      if (state.locations) return;

      // Modules are stored in exports.modules:
      // exports.modules = {};
      const { left, right } = node;

      if (
        left &&
        left.type === "MemberExpression" &&
        left.object &&
        left.object.type === "Identifier" &&
        left.object.name === "exports" &&
        left.property &&
        left.property.type === "Identifier" &&
        left.property.name === "modules" &&
        isModulesHash(right)
      ) {
        state.locations = getModulesLocations(right);
      }
    },

    CallExpression(node, state, callback) {
      if (state.locations) return;

      const args = node.arguments;
      const webpack5IIFEModulesCandidate = getWebpack5IIFEModulesCandidate(
        node,
        topLevelIIFECalls.has(node),
      );

      if (webpack5IIFEModulesCandidate) {
        state.webpack5IIFECandidates.push(webpack5IIFEModulesCandidate);
      }

      // Main chunk with webpack loader.
      // Modules are stored in first argument:
      // (function (...) {...})(<modules>)
      if (
        node.callee.type === "FunctionExpression" &&
        !node.callee.id &&
        args.length === 1 &&
        isSimpleModulesList(args[0])
      ) {
        state.locations = getModulesLocations(args[0]);
        return;
      }

      // Async Webpack < v4 chunk without webpack loader.
      // webpackJsonp([<chunks>], <modules>, ...)
      // As function name may be changed with `output.jsonpFunction` option we can't rely on it's default name.
      if (
        node.callee.type === "Identifier" &&
        mayBeAsyncChunkArguments(args) &&
        args[1].type !== "SpreadElement" &&
        isModulesList(args[1])
      ) {
        state.locations = getModulesLocations(args[1]);
        return;
      }

      // Async Webpack v4 chunk without webpack loader.
      // (window.webpackJsonp=window.webpackJsonp||[]).push([[<chunks>], <modules>, ...]);
      // As function name may be changed with `output.jsonpFunction` option we can't rely on it's default name.
      if (
        isAsyncChunkPushExpression(node) &&
        args[0].type === "ArrayExpression" &&
        args[0].elements[1]
      ) {
        state.locations = getModulesLocations(args[0].elements[1]);
        return;
      }

      // Webpack v4 WebWorkerChunkTemplatePlugin
      // globalObject.chunkCallbackName([<chunks>],<modules>, ...);
      // Both globalObject and chunkCallbackName can be changed through the config, so we can't check them.
      if (isAsyncWebWorkerChunkExpression(node)) {
        state.locations = getModulesLocations(args[1]);
        return;
      }

      // Walking into arguments because some of plugins (e.g. `DedupePlugin`) or some Webpack
      // features (e.g. `umd` library output) can wrap modules list into additional IIFE.
      for (const arg of args) {
        callback(arg, state);
      }
    },
  });

  const modulesLocations =
    walkState.locations ||
    selectWebpack5IIFEModulesLocations(
      walkState.webpack5IIFECandidates,
      expectedModuleIds,
    );
  /** @type {Modules} */
  const modules = {};

  if (modulesLocations) {
    for (const [id, loc] of Object.entries(modulesLocations)) {
      modules[id] = content.slice(loc.start, loc.end);
    }
  }

  return {
    modules,
    src: content,
    runtimeSrc: getBundleRuntime(content, modulesLocations),
  };
};
