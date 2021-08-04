const {
    isValueType, autoType,
    asNumber, asString, asTruthy, asName,
} = require("../helper.js");

const { LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO, Message } = require ("../../util/logging.js");


/*
 * Expression evaluation
 */

function flatten_function_call(ast, ctx, guard) {
    const calls = {
        /* TODO: FUNCTION CALLS
        "COFF":
        "CPAG":
        "DADDR:
        "DEF":
        "DOFF":
        "DPAG":
        "HIGH":
        "LEN":
        "LOW":
        "LST":
        "MAC":
        "MODEL":
        "MXP":
        */
        "ARG": (v) => {
            const index = asNumber(v);
            if (!ctx.macro_parameters || index >= ctx.macro_parameters.length) {
                throw `Argument ${index} is out of bounds`
            }

            return ctx.macro_parameters[index];
        },
        "ABS": (v) => Math.abs(asNumber(v)),
        "AS88": () => "AS88 (node remake)",
        "CADDR": (p, o) => (asNumber(o) & 0x7FFF) | ((asNumber(o) & 0x8000) ? (asNumber(p) << 15) : 0),
        "CAT": (a, b) => (asString(a)+asString(b)),
        "CNT": () => (ctx.macro_parameters ? ctx.macro_parameters.length : 0),
        "MAX": (...args) => Math.max(... args.map(asNumber)),
        "MIN": (...args) => Math.min(... args.map(asNumber)),
        "POS": (v, s, start) => asString(v).indexOf(asString(s), start ? asNumber(start) : 0),
        "SCP": (a, b) => (asString(a) == asString(b)),
        "SGN": (val) => Math.sign(asNumber(val)),
        "SUB": (string, start, length) => {
            const first = asNumber(start)
            return asString(string).substring(first, first+asNumber(length))
        }
    };

    // Calculate parameters and abort if not final
    const parameters = (ast.parameters||[]).map((v) => flatten(v, ctx, true, guard));

    if (!parameters.every(isValueType)) {
        return { ... ast, parameters };
    }

    // Return value
    return {
        location: ast.location,
        ... autoType(calls[ast.name](... parameters))
    };
}

function flatten_unary(ast, ctx, guard) {
    const casting = {
        "MacroLocalConcat":     { value:   asName, op: (v) => ({ type: "Identifier", name: `${ctx.name}${String.fromCharCode(55356, 57173)}${v}` }) },
        "LogicalNot":           { value: asTruthy, op: (v) => v },
        "BitwiseComplement":    { value: asNumber, op: (v) => ~v },
        "Negate":               { value: asNumber, op: (v) => -v },
        "Positive":             { value: asNumber, op: (v) => v },
    };

    const cast = casting[ast.op];
    let value = flatten(ast.value, ctx, cast.value != asName, guard);

    // Value can be an identifier
    if (cast.value == asName) {
        if (value.type != "Identifier") {
            return { ... ast, value };
        }
    } else if (!isValueType(value)) {
        return { ... ast, value };
    }

    if (cast.value) {
        value = cast.value(value);
    }

    // Return our result
    value = autoType(cast.op(value));

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
    let left = flatten(ast.left, ctx, cast.left != asName, guard);
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
    let value = autoType(cast.op(left, right));

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
    case "FunctionCall":
        return flatten_function_call(ast, ctx, guard);
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

function evaluate_statement(ctx, tree, propegate = true) {
    // Helper functions for arrays an falsy values
    if (tree == null) {
        return tree;
    } else if (Array.isArray(tree)) {
        return tree.map((idx) => evaluate_statement(ctx, idx, propegate));
    } else if (tree === undefined) {
        throw "Attempted to evaluate an undefined field"
    }

    // Flatten our expression
    return flatten(tree, ctx, propegate, []);
}

async function* evaluate(ctx, tree) {
    for await (let token of tree) {
        try {
            switch (token.type) {
            // Assembly flow control
            case "IncludeDirective":
                yield {
                    ... token,
                    path: evaluate_statement(ctx, token.path),
                    transform: evaluate_statement(ctx, token.transform)
                };
                break ;
            case "AlignDirective":
            case "RadixDirective":
                yield {
                    ... token,
                    value: evaluate_statement(ctx, token.value)
                };
                break ;

            // Variable Directives
            case "LocalDirective":
            case "GlobalDirective":
            case "ExternDirective":
            case "UndefineDirective":
                yield {
                    ... token,
                    names: evaluate_statement(ctx, token.names, false)
                };
                break ;
            case "SetDirective":
            case "EquateDirective":
            case "DefineDirective":
                yield {
                    ... token,
                    name: evaluate_statement(ctx, token.name, false),
                    value: evaluate_statement(ctx, token.value)
                };
                break ;
            case "LabelDirective":
                yield {
                    ... token,
                    name: evaluate_statement(ctx, token.name, false)
                };
                break ;
            case "IfDirective":
                yield {
                    ... token,
                    conditions: token.conditions.map((clause) => ({
                        ... clause,
                        test: evaluate_statement(ctx, clause.test)
                    }))
                };
                break ;

            // Display directives
            case "MessageDirective":
            case "WarningDirective":
            case "FailureDirective":
                yield {
                    ... token,
                    message: evaluate_statement(ctx, token.message)
                };
                break ;

            // Data section directives
            case "AsciiBlockDirective":
            case "TerminatedAsciiBlockDirective":
            case "DataBytesDirective":
            case "DataWordsDirective":
                yield {
                    ... token,
                    data: evaluate_statement(ctx, token.data)
                };
                break ;
            case "DataAllocateDirective":
                yield {
                    ... token,
                    size: evaluate_statement(ctx, token.size)
                };
                break ;

            // Macro Directives
            case "CountDupDirective":
                yield {
                    ... token,
                    counter: evaluate_statement(ctx, token.counter, false),
                    count: evaluate_statement(ctx, token.count, false),
                };
                break ;

            case "ListDupDirective":
                yield {
                    ... token,
                    counter: evaluate_statement(ctx, token.counter, false),
                    variable: evaluate_statement(ctx, token.variable, false),
                    list: evaluate_statement(ctx, token.list)
                };
                break ;

            case "CharacterDupDirective":
                yield {
                    ... token,
                    counter: evaluate_statement(ctx, token.counter, false),
                    variable: evaluate_statement(ctx, token.variable, false),
                    strings: evaluate_statement(ctx, token.strings)
                };
                break ;

            case "SequenceDupDirective":
                yield {
                    ... token,
                    counter: evaluate_statement(ctx, token.counter, false),
                    variable: evaluate_statement(ctx, token.variable, false),
                    start: evaluate_statement(ctx, token.start),
                    end: evaluate_statement(ctx, token.end),
                    step: evaluate_statement(ctx, token.step),
                };
                break ;

            case "MacroDefinitionDirective":
                yield {
                    ... token,
                    name: evaluate_statement(ctx, token.name, false),
                    parameters: evaluate_statement(ctx, token.parameters, false)
                };
                break ;

            case "PurgeMacrosDirective":
                yield {
                    ... token,
                    names: evaluate_statement(ctx, token.names, false)
                };
                break ;

            case "DispatchDirective":
                yield {
                    ... token,
                    call: evaluate_statement(ctx, token.call, false),
                    parameters: evaluate_statement(ctx, token.parameters)
                };
                break ;

            case "SectionDirective":
            case "NameDirective":
            case "DefineSectionDirective":
                throw new Message(LEVEL_FAIL, token.location, `Unhandled directive (pass: evaluate) ${token.type}`);
            default:
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

async function* lazy_evaluate(ctx, feed) {
    let blocks = [];

    // Run through entire scope before lazy evaluating tree
    for await (let block of feed) {
        if (block instanceof Message) {
            yield block;
            continue ;
        }

        blocks.push(block);
    }

    yield* evaluate(ctx, blocks);
}

module.exports = {
    evaluate,
    lazy_evaluate
};
