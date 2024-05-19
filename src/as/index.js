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

    let defined = [];
    let section = null;
    let defsect = {};

    function* tareSecton() {
        if (!section) {
            return;
        }

        yield { ...section, defined };
        defined = [];
    }

    for await (block of passes.assemble(scope, tree)) {
        switch (block.type) {
            /* Non-sectioned emissions */
            case 'Dependancy':
                yield block;
                continue;

            /* Section declaration emissions */
            case 'DefineSectionDirective':
                {
                    const { name, datatype, at, fit, target } = block;
                    defsect[name.value] = { name, datatype, at, fit, target };
                    continue;
                }

            case 'SectionDirective':
                {
                    const { name, reset, required } = block;
                    const def = defsect[name.value];

                    if (!def) {
                        yield new Message(LEVEL_FAIL, block.location, `Forward declaration of section ${name.value}`);
                        return;
                    }

                    yield* tareSecton();
                    section = { type: "Section", body: [], name: name.value, reset, required };

                    continue;
                }

            /* Contained declaration emissions */
            case 'Fragment':
                defined.push(block.id);
            case "AsciiBlockDirective":
            case "TerminatedAsciiBlockDirective":
            case "DataBytesDirective":
            case "DataWordsDirective":
            case 'Binary':
            case 'AlignDirective':
            case 'BranchDirective':
                if (section == null) {
                    yield new Message(LEVEL_FAIL, block.location, `${block.type} outside of a defined section`);
                    return;
                }

                section.body.push(block);
                continue;

            default:
                throw `UNHANDLED ${block.type}`;
                yield block;
                continue;
        }
    }

    yield* tareSecton();
}

module.exports = {
    defines,
    context,
    assemble
};
