const { LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO, Message } = require ("../../util/logging.js");

// This needs to be dynamic
const radix = 10;

/*
 * Expression evaluation
 */

function isValueType(ast) {
    return ast.type == "Number" || ast.type == "String";
}

function asString(ast) {
    switch (ast.type) {
    case "String":
        return ast.value;
    case "Number":
        return ast.value.toString();
    default:
        throw `Cannot coerse ${ast.type} to string`;
    }
}

function asNumber(ast) {
    switch (ast.type) {
    case "Number":
        return ast.value;
    default:
        throw `Cannot coerse ${ast.type} to number`;
    }
}

function asTruthy(ast) {
    switch (ast.type) {
        case "Number":
            return ast.value != 0;
        case "String":
            return ast.value !== "";
        default:
            throw `Cannot coerse ${ast.type} to number`;
        }
    }

function flatten_unary(ast, scope, guard) {
    throw ast;
}

function flatten_binary(ast, scope, guard) {
    const left = flatten(ast.left, scope, guard);
    const right = flatten(ast.right, scope, guard);

    // These pre-empt
    if (!isValueType(left)) {
        return { ... ast, left, right };
    }

    switch (ast.op) {
        case "LogicalOr":
            return {
                type: "Number",
                location: ast.location,
                value: asTruthy(left) ? left : right
            };

        case "LogicalAnd":
            return {
                type: "Number",
                location: ast.location,
                value: !asTruthy(left) ? left : right
            };
    }

    if (!isValueType(right)) {
        return { ... ast, left, right };
    }

    switch (ast.op) {
        case "Concatinate":
            return {
                type: "Number",
                location: ast.location,
                value: asString(left) + asString(right)
            };

        case "BitwiseOr":
            return {
                type: "Number",
                location: ast.location,
                value: asNumber(left) | asNumber(right)
            };

        case "BitwiseXor":
            return {
                type: "Number",
                location: ast.location,
                value: asNumber(left) ^ asNumber(right)
            };

        case "BitwiseAnd":
            return {
                type: "Number",
                location: ast.location,
                value: asNumber(left) & asNumber(right)
            };


        case "Equal":
            return {
                type: "Number",
                location: ast.location,
                value: left.value === right.value
            };

        case "NotEqual":
            return {
                type: "Number",
                location: ast.location,
                value: left.value !== right.value
            };
        case "Greater":
            return {
                type: "Number",
                location: ast.location,
                value: left.value > right.value
            };
        case "Less":
            return {
                type: "Number",
                location: ast.location,
                value: left.value < right.value
            };
        case "GreaterEqual":
            return {
                type: "Number",
                location: ast.location,
                value: left.value >= right.value
            };
        case "LessEqual":
            return {
                type: "Number",
                location: ast.location,
                value: left.value <= right.value
            };

        case "ShiftLeft":
            return {
                type: "Number",
                location: ast.location,
                value: left.value << right.value
            };

        case "ShiftRight":
            return {
                type: "Number",
                location: ast.location,
                value: left.value >> right.value
            };

        case "Add":
            return {
                type: "Number",
                location: ast.location,
                value: asNumber(left) + asNumber(right)
            };

        case "Subtract":
            return {
                type: "Number",
                location: ast.location,
                value: asNumber(left) - asNumber(right)
            };

        case "Multiply":
            return {
                type: "Number",
                location: ast.location,
                value: asNumber(left) * asNumber(right)
            };

        case "Divide":
            return {
                type: "Number",
                location: ast.location,
                value: asNumber(left) / asNumber(right)
            };

        case "Modulo":
            return {
                type: "Number",
                location: ast.location,
                value: asNumber(left) % asNumber(right)
            };

        default:
            throw `TODO: ${ast.op}`;
    }
}

function flatten(ast, scope, propegate, guard = []) {
    switch (ast.type) {
    // Value types
    case "Fragment":
    case "String":
        return ast;
    case "Number":
        if (typeof ast.value == "number") {
            return ast;
        } else if (typeof ast.value == "string") {
            return { ... ast, value: parseInt(ast.value, radix) };
        } else {
            throw new Message(LEVEL_FAIL, ast.location, `Invalid number value: ${ast.value}`);
        }

    // Operators
    case "UnaryOperation":
        return flatten_unary(ast, scope, guard);
    case "BinaryOperation":
        return flatten_binary(ast, scope, guard);
    // TODO: TERNARY

    // Variables
    case "Identifier":
        {
            if (!propegate) {
                return ast;
            }

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
            return { name:ast.name, ... flatten(scope.get(ast.name).value, scope, propegate, guard.concat(ast.name)) };
        }

    default:
        throw new Message(LEVEL_FAIL, ast.location, `Unknown expression type: ${ast.type}`);
    }
}

function evaluate(scope, tree, propegate = true) {
    // Helper functions for arrays an falsy values
    if (tree == null) {
        return tree;
    } else if (Array.isArray(tree)) {
        return tree.map((idx) => evaluate(scope, idx, propegate));
    } else if (tree === undefined) {
        throw "Attempted to evaluate an undefined field"
    }

    // Flatten our expression
    return flatten(tree, scope);
}

async function* evaluate_pass(scope, tree) {
    for await (let token of tree) {
        try {
            switch (token.type) {
            // Assembly flow control
            case "IncludeDirective":
                Object.assign(token, {
                    path: evaluate(scope, token.path),
                    transform: evaluate(scope, token.transform)
                });
                break ;
            case "AlignDirective":
            case "RadixDirective":
                Object.assign(token, {
                    value: evaluate(scope, token.value)
                });
                break ;
            case "EndDirective":
                // This terminates the assembler, so discard anything that comes after
                // bubble up so it terminates through all scopes
                yield token;
                return ;

            // Variable Directives
            case "LocalDirective":
            case "GlobalDirective":
            case "ExternDirective":
            case "UndefineDirective":
                Object.assign(token, {
                    names: evaluate(scope, token.names)
                });
                break ;
            case "SetDirective":
            case "EquateDirective":
            case "DefineDirective":
                Object.assign(token, {
                    name: evaluate(scope, token.name, false),
                    value: evaluate(scope, token.value)
                });
                break ;
            case "LabelDirective":
                Object.assign(token, {
                    name: evaluate(scope, token.name, false)
                });
                break ;
            case "IfDirective":
                token.conditions.forEach((clause) => {
                    Object.assign(clause, {
                        test: evaluate(scope, clause.test)
                    });
                });
                break ;

            // Display directives
            case "MessageDirective":
            case "WarningDirective":
            case "FailureDirective":
                Object.assign(token, {
                    message: evaluate(scope, token.message)
                });
                break ;

            // Macro Directives
            //case "CountDupDirective":
            //case "ListDupDirective":
            //case "CharacterDupDirective":
            //case "SequenceDupDirective":
            //case "MacroDefinitionDirective":
            //case "PurgeMacrosDirective":
            //case "ExitMacroDirective":

            //case "DispatchDirective":
            //case "SectionDirective":
            //case "NameDirective":
            //case "AsciiBlockDirective":
            //case "TerminatedAsciiBlockDirective":
            //case "DataBytesDirective":
            //case "DataWordsDirective":
            //case "DataAllocateDirective":
            //case "DefineSectionDirective":
                console.log(token);
            default:
                throw new Message(LEVEL_FAIL, token.location, `Unhandled directive (pass: evaluate) ${token.type}`);
                break ;
            }

            yield token;
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

async function* lazy_evaluate_pass(scope, feed) {
    let blocks = [];

    // Run through entire scope before lazy evaluating tree
    for await (let block of feed) {
        if (block instanceof Message) {
            yield block;
            continue ;
        }

        blocks.push(block);
    }

    yield* evaluate_pass(scope, blocks);
}

module.exports = {
    evaluate_pass,
    lazy_evaluate_pass
};
