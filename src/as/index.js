const { expressionParser } = require("./parsers.js");
const { Context } = require("./context.js");
const { passes } = require("./passes/index.js")

const { LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO, Message } = require("../util/logging.js");

const {
    isValueType, autoType,
    asNumber, asString, asTruthy, asName,
} = require("./helper.js");

/* This creates a namespace of defines */
function defines(...pairs) {
    return pairs.reduce((acc, define) => {
        const match = /^([a-z_][a-z0-9_]*)(=(.*))?$/i.exec(define);
        if (!match) {
            throw new Error(`Malformed define: ${define}`);
        }

        let [, key, , value] = match;

        const parser = expressionParser();
        try {
            parser.feed((typeof value != 'undefined') ? value : "1");
            acc[key] = {
                frozen: true,
                define: true,
                export: false,
                value: parser.results[0]
            };
        } catch (e) {
            throw new Error(`Malformed define: ${define}`);
        }

        return acc;
    }, {});
}

function context(define) {
    // Setup our default context
    const scope = new Context({
        globals: {
            ...defines(...define),

            radix: {
                reserved: true,
                value: { ...autoType(10) }
            }
        }
    });

    return scope;
}

async function* assemble(path, scope, loader) {
    // Load our file
    const location = { source: "command-line" };
    const tree = passes.include(location, path, loader);

    let fragmentDefined = [];
    let section = null;
    let defsect = {};

    for await (block of passes.assemble(scope, tree)) {
        switch (block.type) {
            case 'Dependancy':
                yield block;
                continue;
            case 'Fragment':
                fragmentDefined.push(block.id);
                yield block;
                continue;
            case 'DefineSectionDirective':
            case 'SectionDirective':
                yield block;
                continue;
            default:
                console.log(block.type);
                yield block;
                continue;
        }
    }
}

module.exports = {
    defines,
    context,
    assemble
};
