const { expressionParser } = require("./parsers.js");
const { Context } = require("./context.js");
const { passes } = require("./passes/index.js")

const {
    isValueType, autoType,
    asNumber, asString, asTruthy, asName,
} = require("./helper.js");

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

function context(define)
{
    // Setup our default context
    const scope = new Context({
        globals: {
            ... defines(... define),

            radix: {
                export: false,
                value: { ... autoType(10) }
            }
        }
    });

    // These are our registers
    for (const name of RegisterNames) {
        let variable = scope.global(name);
        variable.value = {
            type: "Register", name
        };
        variable.reserved = true;

        variable = scope.global(name.toLowerCase());
        variable.value = {
            type: "Register", name
        };
        variable.reserved = true;
    }

    for (const name of ConditionNames) {
        let variable = scope.global(name);
        variable.value = {
            type: "Condition", name
        };
        variable.reserved = true;


        variable = scope.global(name.toLowerCase());
        variable.value = {
            type: "Condition", name
        };
        variable.reserved = true;
    }

    return scope;
}

async function* assemble(path, scope, loader)
{
    // Load our file
    const location = { source: "command-line" };
    const tree = passes.include(location, path, loader);
    yield* passes.assemble(scope, tree);
}

module.exports = {
    defines,
    context,
    assemble
};
