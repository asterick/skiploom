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

        const parser = expressionParser();
        try {
            parser.feed((typeof value != 'undefined') ? value : "1");
            acc[key] = { type: 'define', value: parser.results };
        } catch(e) {
            throw new Error(`Malformed define: ${define}`);
        }

        return acc;
    }, {});
}

class AssemblerContext {
    constructor(name, parentNamespace) {
        this.name = name
        this.namespace = Object.create(parentNamespace);
        this.blocks = [];
    }

    async* pass1(ast) {
        for (let token of ast) {
            switch (token.type) {
            case "EndDirective":
                // Prematurely end the assembly
                return ;
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
                console.error(`PLEASE IMPLEMENT: ${token.type}`);
                yield token;
                break ;
            default:
                console.error(token);
                throw Error(`Unhandled directive ${token.type}`);
            }
        }
    }

    async assemble(path, loader = 'text.loader.js') {
        // Isolate our namespace
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

        for await (let block of this.pass1(parser.results[0])) {
            console.log(block);
            this.blocks.push(block);
        }

        global.parserSource = global.parserSource.includedFrom;
    }
}

async function* assemble({ files, define }) {
    const namespace = defines(... define);
    // Set our include source as the command-line
    global.parseSource = { source: "command-line" }

    for (let fn of files) {
        const ctx = new AssemblerContext(fn, namespace);
        await ctx.assemble(fn);
        yield ctx;
    }
}

module.exports = {
    defines,
    assemble
};
