const {
    isValueType,
    asNumber, asString, asTruthy, asName,
} = require("../helper.js");

const { uuid } = require("../../util/uuid.js");
const { passes } = require("./index.js")

const {
    LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO,
    Message
} = require("../../util/logging.js");

async function* macro(scope, feed) {
    for await (let token of feed) {
        if (token instanceof Message) {
            yield token;
            continue;
        }

        try {
            switch (token.type) {
                // Macro Directives
                case "MacroDefinitionDirective":
                    {
                        const name = asName(token.name);
                        const body = token.body;
                        const macro = scope.local(name);

                        if (macro.frozen && macro.value) {
                            throw new Message(LEVEL_WARN, token.location, `Cannot reassign frozen value ${name} to macro`);
                        }

                        Object.assign(macro, {
                            macro: true,
                            value: {
                                location: token.location,
                                parameters: token.parameters.map(asName),
                                body
                            }
                        });
                    }
                    continue;

                case "PurgeMacrosDirective":
                    for (const name of token.names.map(asName)) {
                        const variable = scope.get(name);

                        if (!variable || !variable.macro) {
                            throw new Message(LEVEL_WARN, token.location, `No macro named ${name}`);
                            continue;
                        }

                        scope.remove(name);
                    }
                    continue;

                case "DispatchDirective":
                    {
                        const call = asName(token.call);
                        const variable = scope.get(call);

                        // If no macro is found, assume this is a assembly instruction
                        if (!variable || !variable.macro) {
                            // This is likely just an opcode
                            yield token;
                            continue;
                        }

                        // Validate parameters
                        const { parameters } = token;
                        const macro = variable.value;
                        if (macro.parameters.length > parameters.length) {
                            throw new Message(LEVEL_FAIL, token.location, `Expected at least ${macro.parameters.length} arguments, found ${parameters.length}`);
                        }

                        // Setup context
                        const ctx = scope.nest();
                        ctx.macro_parameters = parameters;

                        for (const [i, name] of macro.parameters.entries()) {
                            Object.assign(ctx.local(name), {
                                location: macro.location,
                                value: parameters[i],
                                used: true
                            });
                        }

                        // Assemble sub-block
                        yield* passes.assemble(ctx, macro.body);
                    }
                    continue;

                case "CountDupDirective":
                    {
                        const counter = token.counter && asName(token.counter);
                        const count = asNumber(token.count);

                        for (let value = 0; value < count; value++) {
                            const ctx = scope.nest();
                            if (counter) {
                                Object.assign(ctx.local(counter), {
                                    used: true,
                                    location: token.location,
                                    value: { type: "Number", value }
                                });
                            }

                            yield* passes.assemble(ctx, token.body);
                        }
                    }
                    continue;

                case "ListDupDirective":
                    {
                        const counter = token.counter && asName(token.counter);
                        const variable = asName(token.variable);
                        let iteration = 0;

                        for (let value of token.list) {
                            const ctx = scope.nest();

                            if (counter) {
                                Object.assign(ctx.local(counter), {
                                    used: true,
                                    location: token.location,
                                    value: { type: "Number", value: iteration++ }
                                });
                            }

                            Object.assign(ctx.local(variable), {
                                used: true,
                                location: value.location,
                                value
                            });

                            yield* passes.assemble(ctx, token.body);
                        }
                    }
                    continue;

                case "CharacterDupDirective":
                    {
                        const counter = token.counter && asName(token.counter);
                        const variable = asName(token.variable);
                        let iteration = 0;

                        for (let value of token.strings) {
                            const string = asString(value);

                            for (let idx = 0; idx < string.length; idx++) {
                                const ctx = scope.nest();

                                if (counter) {
                                    Object.assign(ctx.local(counter), {
                                        used: true,
                                        location: token.location,
                                        value: { type: "Number", value: iteration++ }
                                    });
                                }

                                Object.assign(ctx.local(variable), {
                                    used: true,
                                    location: token.location,
                                    value: { type: "Number", value: string.charCodeAt(idx) }
                                });

                                yield* passes.assemble(ctx, token.body);
                            }
                        }
                    }
                    continue;

                case "SequenceDupDirective":
                    {
                        const counter = token.counter && asName(token.counter);
                        const variable = asName(token.variable);
                        const start = token.start ? asNumber(token.start) : 0;
                        const end = asNumber(token.end);
                        const step = token.step ? asNumber(token.step) : 1;

                        let count = start;
                        let iteration = 0;

                        if (step == 0) {
                            throw new Message(LEVEL_FATAL, token.location, `Attempting to use a zero step in DUPF`);
                        }

                        while ((step < 0) ? (count >= end) : (count <= end)) {
                            const ctx = scope.nest();


                            if (counter) {
                                Object.assign(ctx.local(counter), {
                                    used: true,
                                    location: token.location,
                                    value: { type: "Number", value: iteration++ }
                                });
                            }

                            Object.assign(ctx.local(variable), {
                                used: true,
                                location: token.location,
                                value: { type: "Number", value: count }
                            });

                            yield* passes.assemble(ctx, token.body);
                            count += step;
                        }
                    }
                    continue;

                default:
                    // Forward to next phase
                    yield token;
            }
        } catch (msg) {
            if (msg instanceof Message) {
                yield msg;
            } else if (msg instanceof Error) {
                throw msg;
            } else {
                yield new Message(LEVEL_FAIL, token.location, msg);
            }
        }
    }
}

module.exports = {
    macro
};
