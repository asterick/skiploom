const passes = {};
module.exports = { passes };

Object.assign(passes, {
    ... require("./include.js"),
    ... require("./evaluate.js"),
    ... require("./localize.js"),
    ... require("./assemble.js"),
})
