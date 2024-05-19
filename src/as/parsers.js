const nearley = require("nearley");
const grammar = require("./grammar.js");

const expression = Object.assign({}, grammar, { ParserStart: "expression" });

module.exports = {
    sourceParser: () => new nearley.Parser(nearley.Grammar.fromCompiled(grammar)),
    expressionParser: () => new nearley.Parser(nearley.Grammar.fromCompiled(expression))
}
