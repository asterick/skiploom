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
                frozen: true,
                define: true,
                export: false,
                value: parser.results
            };
        } catch(e) {
            throw new Error(`Malformed define: ${define}`);
        }

        return acc;
    }, {});
}

function uuid() {
    // TODO: Return actual UUID
    return "some-uuid";
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
const LEVEL_FAIL = 1;
const LEVEL_WARN = 2;
const LEVEL_INFO = 3;

const LevelName = {
    [LEVEL_FATAL]: "Fatal",
    [LEVEL_FAIL]: "Error",
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

class Scope {
    constructor (globals, top = null) {
        this.globals = globals;
        this.top = top || Object.create(globals);
    }

    scope () {
        return new Scope(this.globals, Object.create(this.top));
    }

    local(name) {
        if (this.globals.hasOwnProperty(name)) {
            throw `Global ${name} is already defined`;
        } else if (!this.top.hasOwnProperty(name)) {
            // Empty local container
            this.top[name] = { };
        }

        return this.top[name];
    }

    global(name) {
        if (this.top[name]) {
            if (this.top[name] != this.globals[name]) {
                throw `Local of name ${name} already exists`;
            }
        } else {
            // Create container for variable
            this.globals[name] = { frozen: true };
        }

        return this.top[name];
    }

    get(name) {
        return this.top[name];
    }

    remove(name) {
        let tree = this.top;

        do {
            if (tree.hasOwnProperty(name)) {
                delete tree[name];
            }

            tree = Object.getPrototypeOf(tree);
        } while (tree != Object.prototype);
    }

    toString() {
        return JSON.stringify(this.top);
    }
}

class AssemblerContext {
    constructor(name) {
        this.name = name;

        this.radix = 10;
        this.incomplete = [];
    }

    /*
     * Expression evaluation
     */
    flatten(ast, scope, guard = []) {
        switch (ast.type) {
        case "Fragment":
        case "String":
            return ast;

        case "Number":
            if (typeof ast.value == "number") {
                return ast;
            } else if (typeof ast.value == "string") {
                const copy = { ... ast };
                copy.value = parseInt(ast.value, this.radix);
                return copy;
            } else {
                throw new Message(LEVEL_FAIL, ast.location, `Invalid number value: ${ast.value}`);
            }

        case "Identifier":
            {
                // Detect circular reference
                if (guard.indexOf(ast.name) >= 0) {
                    throw new Message(LEVEL_FATAL, ast.location, `Circular reference ${guard.join("->")}->${ast.name}`);
                }

                const variable = scope.get(ast.name) || scope.local(ast.name);
                variable.used = true;

                // Implied forward decl
                if (!variable.value) {
                    variable.frozen = true;
                    return ast;
                }

                // Bubble up name (deferred values are implicitly named)
                return { name:ast.name, ... this.flatten(scope.get(ast.name).value, scope, guard.concat(ast.name)) };
            }

        default:
            throw new Message(LEVEL_FAIL, ast.location, `Unknown expression type: ${ast.type}`);
        }
    }

    evaluate(ast, scope, defer = true) {
        const value = this.flatten(ast, scope);

        switch (value.type) {
            case "Number":
            case "String":
            case "Fragment":
                break ;
            default:
                if (defer) {
                    this.incomplete.push(value);
                } else {
                    console.log(ast);
                    throw new Message(LEVEL_FAIL, ast.location, "Cannot defer evaluation for this statement");
                }
                break ;
        }

        return value;
    }

    evaluate_name(ast, scope) {
        // Short cut evaluate
        if (ast.name) {
            return ast.name;
        }

        // Attempt to resolve name
        let condensed = this.evaluate(ast, scope, false);
        if (condensed.type != "Identifier") {
            throw new Message(LEVEL_FAIL, ast.location, "Expression did not evaluate to an identifier");
        }

        return condensed.name;
    }

    evaluate_string(ast, scope) {
        let condensed = this.evaluate(ast, scope, false);

        if (condensed.type == "String") {
            return condensed.value;
        } else if (condensed.type == "Number") {
            return condensed.value.toString();
        } else {
            return null;
        }
    }

    evaluate_number(ast, scope) {
        let condensed = this.evaluate(ast, scope, false);

        if (condensed.type == "Number") {
            return condensed.value;
        } else {
            return null;
        }
    }

    /*
     * First pass assembler
     */
    async* pass1(ast, scope) {
        scope = scope.scope();

        for (let token of ast) {
            try {
                switch (token.type) {
                // Assembly flow control
                case "EndDirective":
                    return ;

                // Variable Directives
                case "LocalDirective":
                    for (const name of token.names.map((n) => this.evaluate_name(n, scope))) {
                        scope.local(name).location = token.location;
                    }
                    break ;
                case "GlobalDirective":
                    for (const name of token.names.map((n) => this.evaluate_name(n, scope))) {
                        scope.global(name).location = token.location;
                    }
                    break ;
                case "ExternDirective":
                    for (const name of token.names.map((n) => this.evaluate_name(n, scope))) {
                        const variable = scope.global(name);
                        variable.location = token.locaiton;

                        for (const attr in token.attributes) {
                            if (variable[attr] && variable[attr] != token.attributes[attr]) {
                                yield new Message(LEVEL_FAIL, token.location, `Variable ${name} already defines ${attr} property as ${variable[attr]}`)
                                break ;
                            }

                            variable[attr] = token.attributes[attr];
                        }
                    }
                    break ;

                case "SetDirective":
                    {
                        const name = this.evaluate_name(token.name, scope);
                        const variable = scope.get(name) || scope.local(name);

                        if (variable.frozen) {
                            throw new Message(LEVEL_FAIL, token.location, `Cannot set frozen value ${name}`)
                        }

                        Object.assign(variable, {
                            value: this.evaluate(token.value, scope),
                            location: token.location
                        });
                    }
                    break ;

                case "EquateDirective":
                    {
                        const name = this.evaluate_name(token.name, scope);
                        const variable = scope.get(name) || scope.global(name);
                        const value = this.evaluate(token.value, scope);

                        if (variable.value) {
                            throw new Message(LEVEL_FAIL, token.location, `Cannot change frozen value ${name}`);
                        }

                        // Assign our value
                        Object.assign(variable, {
                            value,
                            location: token.location,
                            frozen: true
                        });
                    }
                    break ;

                case "LabelDirective":
                    {
                        const name = this.evaluate_name(token.name, scope);
                        const variable = scope.get(name) || scope.local(name);
                        const value = {
                            type: "Fragment",
                            location: token.location,
                            id: uuid()
                        };

                        if (variable.value) {
                            throw new Message(LEVEL_FAIL, token.location, `Cannot define label ${name}`);
                        }

                        // Assign our value
                        Object.assign(variable, {
                            value,
                            location: token.location,
                            frozen: true
                        });

                        yield variable.value;
                    }
                    break ;

                case "DefineDirective":
                    {
                        const name = this.evaluate_name(token.name, scope);
                        const variable = scope.get(name) || scope.global(name);

                        if (variable.value) {
                            throw new Message(LEVEL_FAIL, token.location, `Cannot change frozen value ${name}`);
                        } else if (variable.used) {
                            throw new Message(LEVEL_FAIL, token.location, `Defines may not be deferred ${name}`);
                        }

                        // Assign our value
                        Object.assign(variable, {
                            location: token.location,
                            frozen: true,
                            value: token.value,
                            define: true
                        });
                    }
                    break ;

                case "UndefineDirective":
                    {
                        for (const name of token.names.map((n) => this.evaluate_name(n, scope))) {
                            const variable = scope.get(name);

                            // Warn on undefined values
                            if (!variable || !variable.define) {
                                yield new Message(LEVEL_WARN, token.location, `No definition named ${name}`);
                                continue ;
                            }

                            // Delete reference
                            scope.remove(name);
                        }
                    }
                    break ;

                // Display directives
                case "MessageDirective":
                    yield new Message(LEVEL_INFO, token.location, token.message.map((exp) => this.evaluate_string(exp, scope)).join(" "));
                    break ;
                case "WarningDirective":
                    yield new Message(LEVEL_WARN, token.location, token.message.map((exp) => this.evaluate_string(exp, scope)).join(" "));
                    break ;
                case "FailureDirective":
                    yield new Message(LEVEL_FAIL, token.location, token.message.map((exp) => this.evaluate_string(exp, scope)).join(" "));
                    break ;

                // Macro Directives
                //case "MacroDefinitionDirective":
                //case "PurgeMacrosDirective":
                case "ExitMacroDirective":
                    yield new Message(LEVEL_FAIL, token.location, "Misplaced EXITM, Must be used inside of a macro");
                    break ;

                //case "DispatchDirective":
                //case "SectionDirective":
                //case "AlignDirective":
                //case "IncludeDirective":
                //case "RadixDirective":
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
                    yield new Message(LEVEL_FAIL, token.location, `Unhandled directive ${token.type}`);
                    break ;
                }
            } catch(msg) {
                if (msg instanceof Message) {
                    yield msg;
                    if (msg.level == LEVEL_FATAL) return ;
                } else if(msg instanceof Error) {
                    throw msg;
                } else {
                    yield new Message(LEVEL_FAIL, token.location, msg);
                }
            }
        }

        // Throw errors on undefined values
        for (const name in scope.top) {
            if (!scope.top.hasOwnProperty(name)) {
                continue ;
            }

            const variable = scope.get(name);

            if (!variable.used) {
                if (!variable.value) {
                    yield new Message(LEVEL_WARN, variable.location, `Unused identifier ${name}`);
                } else {
                    yield new Message(LEVEL_WARN, variable.location, `Local variable ${name} is defined, but is never used`);
                }
            } else if (!variable.value) {
                yield new Message(LEVEL_FAIL, variable.location, `Local variable ${name} is used, but is never defined`);
            }
        }

        // Reevaluate local deferred
        let exp;
        while (exp = this.incomplete.shift()) {
            try {
                Object.assign(exp, this.flatten(exp, scope));
            } catch (msg) {
                if (msg instanceof Message) {
                    yield msg;
                    if (msg.level == LEVEL_FATAL) return ;
                } else if(msg instanceof Error) {
                    throw msg;
                } else {
                    yield new Message(LEVEL_FAIL, token.location, msg);
                }
            }
        }
    }

    async assemble(path, scope, loader = 'text.loader.js') {
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
        let blocks = [];
        for await (let block of this.pass1(parser.results[0], scope)) {
            // Emitted a log message
            if (block instanceof Message) {
                console.log(block.toString());
                continue ;
            }

            // This is for a future pass
            blocks.push(block);
        }

        global.parserSource = global.parserSource.includedFrom;
    }
}

async function* assemble({ files, define }) {
    const globals = defines(... define);

    for (let fn of files) {
        // Create a new variable scope (protect globals)
        const scope = new Scope({ ... globals });

        global.parseSource = { source: "file", fn }
        const ctx = new AssemblerContext(fn);
        await ctx.assemble(fn, scope);
        yield ctx;
    }
}

module.exports = {
    defines,
    assemble
};
