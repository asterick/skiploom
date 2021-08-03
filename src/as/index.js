const path = require("path");

const { resolve } = require("../util/resolve.js");
const { expressionParser } = require("./parsers.js");
const { Scope } = require("./scope.js");
const { LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO, Message } = require ("../util/logging.js");
const { evaluate_pass, lazy_evaluate_pass } = require("./passes/evaluate.js");

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

class AssemblerContext {
    constructor(globals) {
        this.parserSource = {
            source: "command-line"
        };

        this.globals = globals;
        this.incomplete = [];
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

    async prospect(scope, ast) {
        const shadow = scope.preserve();
        const pass = this.process(shadow, ast);
        const body = [];

        for await (const block of pass) {
            body.push(block);
        }

        return { shadow, body };
    }

    /*
     * First pass assembler:
     *   Handle include
     *   De-localize variables
     *   Perform Macros
     */
    async* pass1(scope, feed) {
        for await (let token of feed) {
            try {
                switch (token.type) {
                // Assembly flow control
                case "IncludeDirective":
                    {
                        if (token.transform) {
                            yield* this.include(token.path.value, token.transform.value);
                        } else {
                            yield* this.include(token.path.value);
                        }
                    }
                    break ;
                case "EndDirective":
                    // This Ter
                    break ;

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

                        if (scope.get(name)) {
                            throw new Message(LEVEL_ERROR, token.location, `${name} has already been declared`);
                        }

                        const variable = scope.global(name);

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

                            variable.remove(name);
                        }
                    }
                    break ;

                case "IfDirective":
                    {
                        let otherwise = token.otherwise;
                        let conditions = [];

                        for (const { test, body } of token.conditions) {
                            const condition = this.evaluate(test, scope);

                            if (this.isValueType(condition)) {
                                if (this.asTruthy(condition)) {
                                    // This is a stoping condition
                                    otherwise = body;
                                    break ;
                                } else {
                                    // Discard false statement
                                    continue ;
                                }
                            }

                            // Evaluate body here
                            conditions.push({
                                condition,
                                ... await this.prospect(scope, body)
                            });
                        }

                        if (conditions.length >= 1) {
                            let defaults = scope;

                            // We need a fallback clause
                            if (otherwise) {
                                const { shadow, body } = await this.prospect(scope, otherwise);
                                defaults = shadow;
                                otherwise = body;
                            }

                            // Emit newly localized IF directive
                            yield {
                                type: "IfDirective",
                                location: token.location,
                                conditions: conditions.map(({condition, body}) => ({ condition, body })),
                                otherwise: (otherwise.length > 0) ? otherwise : null
                            };

                            // Prospect values
                            let block;
                            while (block = conditions.pop()) {
                                const {shadow, condition} = block;

                                scope.prospect(condition, shadow, defaults);
                                defaults = scope;
                            }
                        } else if (otherwise) {
                            // Simple case: Only one true condition
                            yield* this.process(scope, otherwise);
                        }
                    }

                    break ;

                // Macro Directives
                //case "CountDupDirective":
                //case "ListDupDirective":
                //case "CharacterDupDirective":
                //case "SequenceDupDirective":
                //case "MacroDefinitionDirective":
                //case "PurgeMacrosDirective":
                case "ExitMacroDirective":
                    yield new Message(LEVEL_FAIL, token.location, "Misplaced EXITM, Must be used inside of a macro");
                    break ;

                // Display directives
                //case "MessageDirective":
                //case "WarningDirective":
                //case "FailureDirective":

                //case "DispatchDirective":
                //case "SectionDirective":
                //case "AlignDirective":
                //case "RadixDirective":
                //case "NameDirective":
                //case "AsciiBlockDirective":
                //case "TerminatedAsciiBlockDirective":
                //case "DataBytesDirective":
                //case "DataWordsDirective":
                //case "DataAllocateDirective":
                //case "DefineSectionDirective":
                default:
                    yield new Message(LEVEL_FAIL, token.location, `Unhandled directive ${token.type}`);
                    break ;
                }
            } catch(msg) {
                if (msg instanceof Message) {
                    yield msg;
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
    }

    async* include (target, module = 'text.loader.js') {
        // Import our source transform
        const root = this.parserSource.path ? path.dirname(this.parserSource.path) : process.cwd();
        const loader = require(await resolve(module));
        const fn = await resolve(target, root);

        // Isolate our namespace
        const previous = this.parserSource;
        this.parserSource = {
            source: module,
            includedFrom: this.parserSource,
            path: fn
        };

        for await (let token of loader(fn)) {
            token.location.parserSource = this.parserSource
            yield token;
        }

        this.parserSource = previous;
    }

    process(scope, tree) {
        // Create a local scope
        scope = scope.nest();

        // Run through the various passes
        tree = evaluate_pass(scope, tree);
        //tree = this.pass1(scope, tree);
        tree = lazy_evaluate_pass(scope, tree);

        return tree;
    }

    async assemble(path)
    {
        const scope = new Scope({ ... this.globals });

        // Load our file
        const tree = this.include(path);

        // Begin processing file
        for await (let block of this.process(scope, tree)) {
            // Emitted a log message
            if (block instanceof Message) {
                console.log(block.toString());
                if (block.level == LEVEL_FATAL) return ;
                continue ;
            }

            // This is for a future pass
            //console.log(block);
        }
    }
}

async function* assemble({ files, define }) {
    const globals = defines(... define);

    for (let fn of files) {
        // Create a new variable scope (protect globals)
        const ctx = new AssemblerContext(globals);
        await ctx.assemble(fn);
        yield ctx;
    }
}

module.exports = {
    defines,
    assemble
};
