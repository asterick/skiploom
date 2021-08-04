const { keywords } = require("moo");
const { LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO, Message } = require ("../../util/logging.js");

/*
 * Expression evaluation
 */

function isValueType(ast) {
    return ast.type == "Number" || ast.type == "String";
}

function asName(ast) {
    if (ast.name) {
        return ast.name
    }

    throw `Expression does not have a name`;
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

function flatten_unary(ast, ctx, guard) {
    const casting = {
        "MacroLocalConcat":     { value:   asName, op: (v) => ({ type: "Identifier", name: `${ctx.name}\0${v}` }) },
        "LogicalNot":           { value: asTruthy, op: (v) => v },
        "BitwiseComplement":    { value: asNumber, op: (v) => ~v },
        "Negate":               { value: asNumber, op: (v) => -v },
        "Positive":             { value: asNumber, op: (v) => v },
    };

    const cast = casting[ast.op];
    let value = flatten(ast.value, ctx, cast.value == asName, guard);

    // Value can be an identifier
    if (cast.value == asName) {
        if (value.type != "Identifier") {
            return { ... ast, value };
        }
    } else if (isValueType(value)) {
        return { ... ast, value };
    }

    if (cast.value) {
        value = cast.value(value);
    }

    // Return our result
    value = cast.op(value);

    switch (typeof value) {
        case "object":
            break ;
        case "string":
            value = {
                value,
                type: "String"
            };
            break ;
        case "true":
        case "false":
            value = value ? 1 : 0;
        case "number":
            value = {
                value,
                type: "Number"
            };
            break ;
    }

    return {
        location: ast.location,
        ... value
    };
}

function flatten_binary(ast, ctx, guard) {
    const casting = {
        // Identifier expression
        "IdentifierConcat": { left:   asName, right:   asName, op: (l, r) => ({ type: "Identifier", name: (l + r) }) },
        "ValueConcat":      { left:   asName, right: asNumber, op: (l, r) => ({ type: "Identifier", name: (l + r.toString(10)) }) },
        "HexValueConcat":   { left:   asName, right: asNumber, op: (l, r) => ({ type: "Identifier", name: (l + r.toString(16)) }) },

        // Preemptive values
        "LogicalOr":        { left:     null, right:     null, op: (l, r) => (asTruthy(l) ? l : r) },
        "LogicalAnd":       { left:     null, right:     null, op: (l, r) => (!asTruthy(l) ? l : r) },

        // String operation
        "Concatinate":      { left: asString, right: asString, op: (l, r) => (l + r) },

        // Un-typed operation
        "Equal":            { left:     null, right:     null, op: (l, r) => (l === r) },
        "NotEqual":         { left:     null, right:     null, op: (l, r) => (l !== r) },

        // Numeric operation
        "BitwiseOr":        { left: asNumber, right: asNumber, op: (l, r) => (l | r) },
        "BitwiseXor":       { left: asNumber, right: asNumber, op: (l, r) => (l ^ r) },
        "BitwiseAnd":       { left: asNumber, right: asNumber, op: (l, r) => (l & r) },
        "Greater":          { left: asNumber, right: asNumber, op: (l, r) => (l > r) },
        "Less":             { left: asNumber, right: asNumber, op: (l, r) => (l < r) },
        "GreaterEqual":     { left: asNumber, right: asNumber, op: (l, r) => (l >= r) },
        "LessEqual":        { left: asNumber, right: asNumber, op: (l, r) => (l <= r) },
        "ShiftLeft":        { left: asNumber, right: asNumber, op: (l, r) => (l << r) },
        "ShiftRight":       { left: asNumber, right: asNumber, op: (l, r) => (l >> r) },
        "Add":              { left: asNumber, right: asNumber, op: (l, r) => (l + r) },
        "Subtract":         { left: asNumber, right: asNumber, op: (l, r) => (l - r) },
        "Multiply":         { left: asNumber, right: asNumber, op: (l, r) => (l * r) },
        "Divide":           { left: asNumber, right: asNumber, op: (l, r) => (l / r) },
        "Modulo":           { left: asNumber, right: asNumber, op: (l, r) => (l % r) }
    }

    if (!ast.op) {
        throw `Unhandled operation type ${ast.op}`
    }

    const cast = casting[ast.op];
    let left = flatten(ast.left, ctx, cast.left == asName, guard);
    let right = flatten(ast.right, ctx, true, guard);

    // Left side can be an identifier
    if (cast.left == asName) {
        if (left.type != "Identifier") {
            return { ... ast, left, right};
        }
    } else if (!isValueType(left)) {
        return { ... ast, left, right };
    }

    if (cast.left) {
        left = cast.left(left);
    }

    // The right has to have resolved as being a value
    if (!isValueType(right)) {
        return { ... ast, right, right };
    }

    if (cast.right) {
        right = cast.right(right);
    }

    // Return result and wrap it
    let value = cast.op(left, right);

    switch (typeof value) {
        case "object":
            break ;
        case "string":
            value = {
                value,
                type: "String"
            };
            break ;
        case "true":
        case "false":
            value = value ? 1 : 0;
        case "number":
            value = {
                value,
                type: "Number"
            };
            break ;
    }

    return {
        location: ast.location,
        ... value
    };
}

function flatten(ast, ctx, propegate, guard) {
    switch (ast.type) {
    // Value types
    case "Fragment":
    case "String":
        return ast;
    case "Number":
        if (typeof ast.value == "number") {
            return ast;
        } else if (typeof ast.value == "string") {
            return { ... ast, value: parseInt(ast.value, ctx.radix()) };
        } else {
            throw new Message(LEVEL_FAIL, ast.location, `Invalid number value: ${ast.value}`);
        }

    // Operators
    case "UnaryOperation":
        return flatten_unary(ast, ctx, guard);
    case "BinaryOperation":
        return flatten_binary(ast, ctx, guard);
     case "TernaryOperation":
        {
            const value = flatten(ast.test, ctx, true, guard);
            const onTrue = flatten(ast.onTrue, ctx, true, guard);
            const onFalse = flatten(ast.onFalse, ctx, true, guard);

            if (!isValueType(value)) {
                return { ... ast, value };
            }

            return flatten(asTruthy(value) ? onTrue : onFalse, ctx, true, guard);
        }

    // Variables
    case "Identifier":
        {
            // We want the raw identifier
            if (!propegate) {
                return ast;
            }

            // Detect circular reference
            if (guard.indexOf(ast.name) >= 0) {
                throw new Message(LEVEL_FATAL, ast.location, `Circular reference ${guard.join("->")}->${ast.name}`);
            }

            const variable = ctx.get(ast.name) || ctx.local(ast.name);
            variable.used = true;

            // Implied forward decl
            if (!variable.value) {
                variable.frozen = true;
                return ast;
            }

            // Bubble up name (deferred values are implicitly named)
            return { name:ast.name, ... flatten(ctx.get(ast.name).value, ctx, propegate, guard.concat(ast.name)) };
        }

    default:
        throw new Message(LEVEL_FAIL, ast.location, `Unknown expression type: ${ast.type}`);
    }
}

function evaluate(ctx, tree, propegate = true) {
    // Helper functions for arrays an falsy values
    if (tree == null) {
        return tree;
    } else if (Array.isArray(tree)) {
        return tree.map((idx) => evaluate(ctx, idx, propegate));
    } else if (tree === undefined) {
        throw "Attempted to evaluate an undefined field"
    }

    // Flatten our expression
    return flatten(tree, ctx, propegate, []);
}

async function* evaluate_pass(ctx, tree) {
    for await (let token of tree) {
        try {
            switch (token.type) {
            // Assembly flow control
            case "IncludeDirective":
                Object.assign(token, {
                    path: evaluate(ctx, token.path),
                    transform: evaluate(ctx, token.transform)
                });
                break ;
            case "AlignDirective":
            case "RadixDirective":
                Object.assign(token, {
                    value: evaluate(ctx, token.value)
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
                    names: evaluate(ctx, token.names, false)
                });
                break ;
            case "SetDirective":
            case "EquateDirective":
            case "DefineDirective":
                Object.assign(token, {
                    name: evaluate(ctx, token.name, false),
                    value: evaluate(ctx, token.value)
                });
                break ;
            case "LabelDirective":
                Object.assign(token, {
                    name: evaluate(ctx, token.name, false)
                });
                break ;
            case "IfDirective":
                token.conditions.forEach((clause) => {
                    Object.assign(clause, {
                        test: evaluate(ctx, clause.test)
                    });
                });
                break ;

            // Display directives
            case "MessageDirective":
            case "WarningDirective":
            case "FailureDirective":
                Object.assign(token, {
                    message: evaluate(ctx, token.message)
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
                break ;

            // Internal Object pass-throughs
            case "Fragment":
                yield token;
                break ;

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

async function* lazy_evaluate_pass(ctx, feed) {
    let blocks = [];

    // Run through entire scope before lazy evaluating tree
    for await (let block of feed) {
        if (block instanceof Message) {
            yield block;
            continue ;
        }

        blocks.push(block);
    }

    yield* evaluate_pass(ctx, blocks);
}

module.exports = {
    isValueType,
    asNumber, asString, asTruthy, asName,

    evaluate_pass,
    lazy_evaluate_pass
};
