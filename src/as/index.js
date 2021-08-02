const deepcopy = require("../util/deepcopy.js");
const { resolve } = require("../util/resolve.js");
const { expressionParser, sourceParser } = require("./parsers.js");

/* This creates a namespace of defines */
function defines(... pairs) {
    return pairs.reduce((acc, define) => {
        const match = /^([a-z_][a-z0-9_]*)(=(.*))?$/i.exec(define);
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
            acc[key] = {
                type: 'define',
                global: false,
                value: parser.results
            };
        } catch(e) {
            throw new Error(`Malformed define: ${define}`);
        }

        return acc;
    }, {});
}

/*
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
*/

const LEVEL_FATAL = 0;
const LEVEL_ERROR = 1;
const LEVEL_WARN = 2;
const LEVEL_INFO = 3;

const LevelName = {
    [LEVEL_FATAL]: "Fatal",
    [LEVEL_ERROR]: "Error",
    [LEVEL_WARN]: "Warning",
    [LEVEL_INFO]: "Message",
}

class Message {
    constructor(level, location, message) {
        this.level = level;
        this.location = location;
        this.message = message;
    }

    toString() {
        if (this.location) {
            return `${LevelName[this.level]} (${this.location.line}:${this.location.col}): ${this.message}`;
        } else {
            return `${LevelName[this.level]}: ${this.message}`;
        }
    }
}

class AssemblerContext {
    constructor(name, globals) {
        this.name = name;

        this.radix = 10;
        this.globals = globals;
        this.blocks = [];
    }

    /*
     * Expression evaluation
     */
    evaluate(ast, scope) {
        switch (ast.type) {
        case "Identifier":
            if (scope[ast.name]) {
                return { name:ast.name, ... scope[ast.name] };
            }
            return ast;
        default:
            throw new Error(`Unknown expression type: ${ast.type}`);
        }
    }

    evaluate_name(ast, scope) {
        let condensed = this.evaluate(ast, scope);

        if (!condensed.name) {
            throw new Error("Expression does not evaluate with a name");
        }

        return condensed.name;
    }

    /*
     * Helper functions
     */
    local(name, scope) {
        if (this.globals.hasOwnProperty(name)) {
            throw `Global ${name} is already defined`;
        } else if (!scope.hasOwnProperty(name)) {
            // Empty local container
            scope[name] = {};
        }

        return scope[name];
    }

    global(name, scope) {
        if (scope[name]) {
            if (scope[name] != this.globals[name]) {
                throw `Local of name ${name} already exists`;
            }
        } else {
            // Create container for variable
            this.globals[name] = { frozen: true };
        }

        return scope[name];
    }

    /*
     * First pass assembler
     */
    async* pass1(ast, scope) {
        for (let token of ast) {
            try {
                switch (token.type) {
                // Variable Directives
                case "LocalDirective":
                    for (const name of token.names.map((n) => this.evaluate_name(n, scope))) {
                        this.local(name, scope);
                    }

                    break ;

                case "GlobalDirective":
                    for (const name of token.names.map((n) => this.evaluate_name(n, scope))) {
                        this.global(name, scope);
                    }

                    break ;

                case "ExternDirective":
                    for (const name of token.names.map((n) => this.evaluate_name(n, scope))) {
                        const variable = this.global(name, scope);

                        for (const attr in token.attributes) {
                            if (variable[attr] && variable[attr] != token.attributes[attr]) {
                                yield new Message(LEVEL_ERROR, token.location, `Variable ${name} already defines ${attr} property as ${variable[attr]}`)
                                break ;
                            }

                            variable[attr] = token.attributes[attr];
                        }
                    }
                    break ;

                //case "EquateDirective":
                //case "SetDirective":

                // Macro Directives
                //case "MacroDefinitionDirective":
                //case "PurgeMacrosDirective":
                case "ExitMacroDirective":
                    yield new Message(LEVEL_ERROR, ast.location, "Misplaced EXITM, Must be used inside of a macro");
                    break ;

                //case "LabelDirective":
                //case "DispatchDirective":
                //case "SectionDirective":
                //case "AlignDirective":
                //case "DefineDirective":
                //case "UndefineDirective":
                //case "MessageDirective":
                //case "WarningDirective":
                //case "FailureDirective":
                //case "IncludeDirective":
                //case "RadixDirective":
                case "EndDirective":
                    // Prematurely end the assembly
                    return ;
                //case "NameDirective":
                //case "AsciiBlockDirective":
                //case "TerminatedAsciiBlockDirective":
                //case "DataBytesDirective":
                //case "DataWordsDirective":
                //case "DataAllocateDirective":
                //case "CountDupDirective":
                //case "ListDupDirective":
                //case "CharacterDupDirective":
                //case "SequenceDupDirective":
                //case "IfDirective":
                //case "DefineSectionDirective":
                default:
                    yield new Message(LEVEL_ERROR, token.location, `Unhandled directive ${token.type}`);
                    break ;
                }
            } catch(msg) {
                yield new Message(LEVEL_ERROR, token.location, msg);
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

        // Start with first pass assembler
        var scope = Object.create(this.globals);
        for await (let block of this.pass1(parser.results[0], scope)) {
            // Emitted a log message
            if (block instanceof Message) {
                console.log(block.toString());
                continue ;
            }

            // This is for a future pass
            this.blocks.push(block);
        }

        global.parserSource = global.parserSource.includedFrom;
    }
}

async function* assemble({ files, define }) {
    // Set our include source as the command-line
    const globals = defines(... define);

    for (let fn of files) {
        global.parseSource = { source: "file", fn }
        const ctx = new AssemblerContext(fn, globals);
        await ctx.assemble(fn);
        yield ctx;
    }
}

module.exports = {
    defines,
    assemble
};
