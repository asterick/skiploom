#!/usr/bin/env node

const parser = require("./parsers").expression;

parser.feed('(1+2)')

//parser.feed('^SomeLabel\\SomeOtherLabel: ADC [HL], #@COFF(0FACEh * MAP_PTR, 5h), "asdf\\n" ; Some comment\\\n Some more comment\n')
console.log(JSON.stringify(parser.results, null, 4))
