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

parser.add_argument('-f', '--force', { action: 'store_true', help: "Force assembly, even if dependancies have not changed", 'default': false } )
parser.add_argument('-v', '--version', { action: 'version', version: require("../package.json").version });
parser.add_argument('-I', '--include', { action: 'append', help: "Add include to search path", 'default': [] });
parser.add_argument('-D', '--define', { action: 'append', help: "Define symbol", 'default': [] });
parser.add_argument('-L', '--loader', { action: 'store', help: "Set default file loader", 'default': "text.loader.js" });
parser.add_argument('-o', '--output', { help: "Output filename" })
parser.add_argument('files', { metavar:'file', nargs:'+', help: 'Files to bundle' })

const argv = parser.parse_args();

// Search paths should include supplied paths, and the current working directory (highest priority)
searchPaths.unshift(process.cwd(), './', ... argv.include);

// Process our files
async function main() {
    let { files, define } = argv;

    // Check dependancies for change
    if (!argv.force) {
        // if we are not linking: Check if output dependancies have changed,
        // if not, simply abort
    }

    // Make sure our instruction table is ready
    await generate();

    for (let fn of files) {
        const scope = context(define);

        // Create a new variable scope (protect globals)
        for await (block of assemble(fn, scope, argv.loader)) {
            // Emitted a log message
            if (block instanceof Message) {
                console.log(block.toString());
                if (block.level == LEVEL_FATAL) process.exit(1);
                continue ;
            }

            if (block.type == "Dependancy") {
                continue ;
            }

            // Handle non-assembler directives here
            console.dir(block);
        }

        // Emit sections + definitions here
        //console.dir(scope.globals)
    }
}

main();
