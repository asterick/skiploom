const { expressionParser } = require("./parsers.js");
const { Context } = require("./context.js");
const { passes } = require("./passes/index.js")
const { generate } = require("../util/table.js");

const {
    isValueType, autoType,
    asNumber, asString, asTruthy, asName,
} = require("./helper.js");

const {
    LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO,
    Message
} = require ("../util/logging.js");

/* This creates a namespace of defines */
function defines(... pairs) {
    return pairs.reduce((acc, define) => {
        const match = /^([a-z_][a-z0-9_]*)(=(.*))?$/i.exec(define);
        if (!match) {
            throw new Error(`Malformed define: ${define}`);
        }

        let[,key,,value] = match;

        const parser = expressionParser();
        try {
            parser.feed((typeof value != 'undefined') ? value : "1");
            acc[key] = {
                frozen: true,
                define: true,
                export: false,
                value: parser.results[0]
            };
        } catch(e) {
            throw new Error(`Malformed define: ${define}`);
        }

        return acc;
    }, {});
}

const RegisterNames = [
    "ALL", "ALE",
    "BR", "SC",
    "NB", "CB","EP", "XP", "YP",
    "A", "B", "H", "L",
    "PC", "SP", "BA", "HL", "IX", "IY"
];

const ConditionNames = [
    "LT", "LE", "GT", "GE",
    "C", "Z", "V", "M",
    "NC", "NZ", "NV", "P",
    "F0", "F1", "F2", "F3",
    "NF0", "NF1", "NF2", "NF3",
];

async function* assemble_file(path, globals)
{
    // Setup our default context
    const scope = new Context({
        radix: {
            export: false,
            value: { ... autoType(10) }
        },
        ... globals
    });

    // These are our registers
    for (const name of RegisterNames) {
        let variable = scope.global(name);
        variable.value = {
            type: "Register", name
        }

        variable = scope.global(name.toLowerCase());
        variable.value = {
            type: "Register", name
        }
    }

    for (const name of ConditionNames) {
        let variable = scope.global(name);
        variable.value = {
            type: "Condition", name
        }

        variable = scope.global(name.toLowerCase());
        variable.value = {
            type: "Condition", name
        }
    }

    // Load our file
    const location = { source: "command-line" };
    const tree = passes.include(location, path);
    yield* passes.assemble(scope, tree);
}

async function* assemble({ files, define }) {
    const globals = defines(... define);

    // Make sure our instruction table is ready
    await generate();

    for (let fn of files) {
        // Create a new variable scope (protect globals)
        for await (block of assemble_file(fn, globals)) {
            // Emitted a log message
            if (block instanceof Message) {
                console.log(block.toString());
                if (block.level == LEVEL_FATAL) return ;
                continue ;
            }

            // Eventually this should be passed off to the linker
            console.log(block);
        }
    }
}

module.exports = {
    defines,
    assemble
};
