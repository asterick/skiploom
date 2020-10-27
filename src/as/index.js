const { resolve } = require("../util/resolve.js");
const { expressionParser, sourceParser } = require("./parsers.js");

/* This creates a namespace of defines */
function defines(... pairs) {
    return pairs.reduce((acc, define) => {
        const match = /^([a-z_][a-z0-9_]*)(=(.*))?$/.exec(define);
        if (!match) {
            throw new Error(`Malformed define: ${define}`);
        }

        let[,key,,value] = match;

        global.parseSource = {
            source: "command-line",
            path: key
        }

        if (typeof value != 'undefined') {
            try {
                const parser = expressionParser();
                parser.feed(value);
                acc[key] = { type: 'define', value: parser.results };
            } catch(e) {
                throw new Error(`Malformed define: ${value}`);
            }
        } else {
            acc[key] = { type: 'define', value: { type: 'Number', value: 1 } };
        }

        return acc;
    }, {});
}

async function* assemblePass1(namespace, ast) {
    for (let token of ast) {
        switch (token.type) {
        case "LabelDirective":
        case "DispatchDirective":
        case "SectionDirective":
        case "AlignDirective":
        case "DefineDirective":
        case "UndefineDirective":
        case "MessageDirective":
        case "WarningDirective":
        case "FailureDirective":
        case "IncludeDirective":
        case "RadixDirective":
        case "EndDirective":
        case "ExternDirective":
        case "EquateDirective":
        case "SetDirective":
        case "LocalDirective":
        case "GlobalDirective":
        case "NameDirective":
        case "AsciiBlockDirective":
        case "TerminatedAsciiBlockDirective":
        case "DataBytesDirective":
        case "DataWordsDirective":
        case "DataAllocateDirective":
        case "ExitMacroDirective":
        case "PurgeMacrosDirective":
        case "CountDupDirective":
        case "ListDupDirective":
        case "CharacterDupDirective":
        case "SequenceDupDirective":
        case "MacroDefinitionDirective":
        case "IfDirective":
        case "DefineSectionDirective":
            break ;
        default:
            console.error(token);
            throw Error(`Unhandled directive ${token.type}`);
        }
        yield token;
    }
}

async function* assembleFile(namespace, path, loader = 'text.loader.js') {
    // Isolate our namespace
    namespace = Object.create(namespace);

    global.parserSource = {
        source: loader,
        includedFrom: global.parserSource,
        path
    }

    // Import our source transform
    loader = require(await resolve(loader));

    // Parse our sourcecode
    const parser = sourceParser();
    for await (let chunk of loader(path)) {
        parser.feed(chunk);
    }
    parser.feed("\n");

    yield* assemblePass1(namespace, parser.results[0]);

    global.parserSource = global.parserSource.includedFrom;
}

async function assemble({ files, define }) {
    // Pull in our command line parameters
    const namespace = defines(... define);

    // Set our include source as the command-line
    global.parseSource = { source: "command-line" }

    // Package our units
    let bundle = [];
    for (let fn of files) {
        for await (let token of assembleFile(namespace, fn)) {
            bundle.push(token)
        }
    }

    return bundle;
}

module.exports = {
    defines,
    assemble
};
