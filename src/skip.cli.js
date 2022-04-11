#!/usr/bin/env node
const path = require("path");
const fs = require('fs/promises');

const { ArgumentParser } = require('argparse');

const { searchPaths } = require( "./util/resolve");
const { generate } = require("./util/table.js");
const bson = require('./util/bson.js');

const { context, assemble } = require("./as");

const {
    LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO,
    Message
} = require ("./util/logging.js");

const parser = new ArgumentParser({
    description: 'Skiploom - S1C88 Microcontroller Toolchain',
    add_help: true
});

parser.add_argument('-d', '--make-dependancies', { action: 'store', help: "Add dependancy file generation" } )
parser.add_argument('-v', '--version', { action: 'version', version: require("../package.json").version });
parser.add_argument('-I', '--include', { action: 'append', help: "Add include to search path", 'default': [] });
parser.add_argument('-D', '--define', { action: 'append', help: "Define symbol", 'default': [] });
parser.add_argument('-l', '--link', { action: 'store_true', help: "Link objects and create a binary" });
parser.add_argument('-L', '--loader', { action: 'store', help: "Set default file loader", 'default': "text.loader.js" });
parser.add_argument('-o', '--output', { help: "Output filename", default: 'a.out' })
parser.add_argument('files', { metavar:'file', nargs:'+', help: 'Files to bundle' })

const argv = parser.parse_args();

// Search paths should include supplied paths, and the current working directory (highest priority)
searchPaths.unshift(process.cwd(), './', ... argv.include);

async function* collate(argv, exports) {
    let { files, define } = argv;

    // Load all our objects into memory
    for (let fn of files) {
        // Check if this is a assembler object file, if so import it special 
        const object = await bson.load(fn);
        let globals;

        if (object) {
            // Load our object file and pass it in as already procesed
            globals = object.exports;
            yield* object.blocks;
        } else {
            // Create a new variable scope (protect globals)
            const scope = context(define);

            // Pass through all our unassembled blocks
            yield* assemble(fn, scope, argv.loader);

            // Finally mark our globals for export
            globals = scope.globals;
        }
        
        // Export globals
        for (const [key, global] of Object.entries(globals)) {
            // We do not care about forward references, or reserved words
            if (!global.value || global.reserved) continue ;

            if (exports[key] !== undefined) {
                // This was a weak reference, simply discard it
                if (global.weak) {
                    continue ;
                } else if (!exports[key].weak) {
                    yield new Message(LEVEL_ERROR, `Attempted to redefine global variable ${key}`);
                    continue ;
                }
            }

            // Save the most important data from this Export
            let { location, weak, value } = global;
            exports[key] = { location, weak, value };
        }
    }
}

// Process our files
async function main() {
    const exports = {};
    const blocks = [];
    const dependancies = [];
    let exit_error = false;

    // Make sure our instruction table is ready
    await generate();

    // Begin collating all our files into one large object
    for await(block of collate(argv, exports)) {
        // Emitted a log message
        if (block instanceof Message) {
            console.log(block.toString());

            if (block.level <= LEVEL_FAIL) {
                // This error will prevent output
                exit_error = true;            

                // This is a terminal error, abort early
                if (block.level <= LEVEL_FATAL) break ;
            }
            continue ;
        }

        if (block.type == "Dependancy") {
            dependancies.push(path.relative(process.cwd(), block.filename));
            continue ;
        }

        blocks.push(block);
    }

    // Terminate early if we have encountered an error
    if (exit_error) process.exit(1);

    // Generate dependancy file
    if (argv.make_dependancies) {
        const fout = await fs.open(argv.make_dependancies, "w");
        await fout.write(`${argv.output} ${argv.make_dependancies}: ${dependancies.join(" ")}\n`);
        await fout.write(`${dependancies.join(" ")}:\n`);
        await fout.close();
    }    

    // Finally generate our output
    if (argv.link) {
        console.error("LINKING IS NOT COMPLETE");
        process.exit(1);
    } else {
        bson.save(argv.output, {
            blocks, exports
        });
    }
}

main();
