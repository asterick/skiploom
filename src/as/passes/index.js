const passes = {};
module.exports = { passes };

Object.assign(passes, {
    ... require("./assemble.js"),
    ... require("./include.js"),
    ... require("./evaluate.js"),
    ... require("./localize.js"),
    ... require("./macro.js"),
    ... require("./finalize.js"),
})
