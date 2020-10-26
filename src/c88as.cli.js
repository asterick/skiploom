#!/usr/bin/env node
const yargs = require('yargs/yargs');

const { searchPaths, resolve } = require( "./util/resolve");
const assemble = require("./as");

const argv = yargs(process.argv.slice(2))
    .usage('Usage: $0 [options] ... files')
    .help('h')
    .version(require('../package.json').version)
    .default('I', [], "Include search path")
    .argv
    ;

// Search paths should include supplied paths, and the current working directory (highest priority)
searchPaths.unshift(process.cwd(), ... argv.I);

// Process our files
async function main() {
    for (let fn of argv._) {
        await assemble(fn);
    }
}

main();
