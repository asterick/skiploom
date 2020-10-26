const nearley = require("nearley");
const grammar = require("./grammar.js");

const expression = Object.assign({}, grammar, {ParserStart: "expression"});

const sourceParser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
const expressionParser = new nearley.Parser(nearley.Grammar.fromCompiled(expression));

module.exports = {
    source: sourceParser,
    expression: expressionParser
}
