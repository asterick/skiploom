#!/usr/bin/env node
const { ArgumentParser } = require('argparse');

const { searchPaths, resolve } = require( "./util/resolve");
const { defines, assemble } = require("./as");

const parser = new ArgumentParser({
    description: 'S1C88 Assembler and Linker',
    add_help: true
});

parser.add_argument('-v', '--version', { action: 'version', version: require("../package.json").version });
parser.add_argument('-I', '--include', { action: 'append', help: "Add include to search path", 'default': [] });
parser.add_argument('-D', '--define', { action: 'append', help: "Define symbol", 'default': [] });
parser.add_argument('-o', '--output', { help: "Output filename" })
parser.add_argument('files', { metavar:'file', nargs:'+', help: 'Files to bundle' })

const argv = parser.parse_args();

// Search paths should include supplied paths, and the current working directory (highest priority)
searchPaths.unshift(process.cwd(), ... argv.include);

// Process our files
async function main() {
    for await (let object of assemble(argv)) {
        // console.dir(object);
    }
}

main();
