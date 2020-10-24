#!/usr/bin/env node
const nearley = require("nearley");
const grammar = require("./grammar.js");

const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));

parser.feed('"Hello world\\n\\r\x31" ; This is a comment \\\n more text\n')
console.log(JSON.stringify(parser.results, null, 4))
