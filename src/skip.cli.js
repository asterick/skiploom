#!/usr/bin/env node
const { ArgumentParser } = require('argparse');

const { searchPaths, resolve } = require( "./util/resolve");
const { generate } = require("./util/table.js");
const { defines, context, assemble } = require("./as");

const {
    LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO,
    Message
} = require ("./util/logging.js");

const parser = new ArgumentParser({
    description: 'Skiploom - S1C88 Microcontroller Toolchain',
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
    let { files, define } = argv;
    const scope = context(define);
    
    // Make sure our instruction table is ready
    await generate();

    for (let fn of files) {
        console.log(fn)
        // Create a new variable scope (protect globals)
        for await (block of assemble(fn, scope)) {
            // Emitted a log message
            if (block instanceof Message) {
                console.log(block.toString());
                if (block.level == LEVEL_FATAL) return ;
                continue ;
            }

            console.dir(block);
            //yield block;
        }

        // Emit sections + definitions here
        //console.dir(object);
    }

    //console.log(scope);
}

main();
