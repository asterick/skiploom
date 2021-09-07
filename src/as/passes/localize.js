const {
    isValueType,
    asNumber, asString, asTruthy, asName,
} = require("../helper.js");

const { uuid } = require("../../util/uuid.js");
const { passes } = require("./index.js")

const {
    LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO,
    Message
} = require ("../../util/logging.js");

async function prospect(scope, ast) {
    const shadow = scope.preserve();
    const pass = passes.assemble(shadow.nest(), ast);
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

async function* localize(scope, feed) {
    for await (let token of feed) {
        if (token instanceof Message) {
            yield token;
            continue ;
        }

        try {
            switch (token.type) {
            // Assembly flow control
            case "IncludeDirective":
                {
                    const context = scope.clone();
                    const feed = passes.include(token.location, asString(token.path), token.transform ? asString(token.transform) : undefined);

                    yield* passes.assemble(context, feed, false);
                }
                continue ;

            case "RadixDirective":
                {
                    const variable = scope.global('radix');

                    if (variable.frozen && variable.value) {
                        throw new Message(LEVEL_FAIL, token.location, `Radix is frozen`)
                    }

                    Object.assign(variable, {
                        value: token.value,
                        location: token.location
                    });
                }
                continue ;

            // Variable Directives
            case "LocalDirective":
                for (const name of token.names.map(asName)) {
                    scope.local(name).location = token.location;
                }
                continue ;

            case "SetDirective":
                {
                    const name = asName(token.name);
                    const variable = scope.get(name) || scope.local(name);

                    if (variable.frozen && variable.value) {
                        throw new Message(LEVEL_FAIL, token.location, `Cannot set frozen value ${name}`)
                    }

                    Object.assign(variable, {
                        value: token.value,
                        location: token.location
                    });
                }
                continue ;

            case "EquateDirective":
                {
                    const name = asName(token.name);
                    const variable = scope.get(name) || scope.global(name);

                    if (variable.frozen && variable.value) {
                        throw new Message(LEVEL_FAIL, token.location, `Cannot change frozen value ${name}`);
                    }

                    // Assign our value
                    Object.assign(variable, {
                        value: token.value,
                        location: token.location,
                        frozen: true
                    });
                }
                continue ;

            case "LabelDirective":
                {
                    const name = asName(token.name);
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
                continue ;

            case "DefineDirective":
                {
                    const name = asName(token.name);

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
                continue ;

            case "UndefineDirective":
                for (const name of token.names.map(asName)) {
                    const variable = scope.get(name);

                    // Warn on undefined values
                    if (!variable || !variable.define) {
                        throw new Message(LEVEL_WARN, token.location, `No definition named ${name}`);
                        continue ;
                    }

                    variable.remove(name);
                }
                continue ;

            case "IfDirective":
                {
                    let otherwise = token.otherwise;
                    let conditions = [];

                    for (const { test, body } of token.conditions) {
                        if (isValueType(test)) {
                            if (asTruthy(test)) {
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
                            test,
                            ... await prospect(scope, body)
                        });
                    }

                    if (conditions.length >= 1) {
                        let defaults = scope;

                        // We need a fallback clause
                        if (otherwise) {
                            const { shadow, body } = await prospect(scope, otherwise);
                            defaults = shadow;
                            otherwise = body;
                        }

                        // Emit newly localized IF directive
                        yield {
                            type: "IfDirective",
                            location: token.location,
                            conditions: conditions.map(({test, body}) => ({ test, body })),
                            otherwise: (otherwise && (otherwise.length > 0)) ? otherwise : null
                        };

                        // Prospect values
                        let block;
                        while (block = conditions.pop()) {
                            const {shadow, test} = block;

                            scope.prospect(test, shadow, defaults);
                            defaults = scope;
                        }
                    } else if (otherwise) {
                        // Simple case: Only one true condition
                        yield* passes.assemble(scope.nest(), otherwise);
                    }
                }

                continue ;

            default:
                // Forward to next phase
                yield token;
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
}

module.exports = {
    localize
};
