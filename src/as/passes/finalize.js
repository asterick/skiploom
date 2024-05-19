const {
    isValueType, isNumber, autoType,
    asNumber, asString, asTruthy, asName,
} = require("../helper.js");

const { LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO, Message } = require("../../util/logging.js");

const encoder = new TextEncoder();

async function* finalize(scope, tree) {
    const merge = [];

    for await (let token of tree) {
        if (token instanceof Message) {
            yield token;
            continue;
        }

        try {
            switch (token.type) {
                // Termination cases
                case "EndDirective":
                    // This terminates the assembler, so discard anything that comes after
                    // bubble up so it terminates through all scopes
                    yield token;
                    return;
                case "ExitMacroDirective":
                    yield new Message(LEVEL_FAIL, token.location, "Misplaced EXITM, Must be used inside of a macro");
                    return;

                // Display directives
                case "MessageDirective":
                    if (token.message.every(isValueType)) {
                        yield new Message(LEVEL_INFO, token.location, token.message.map(asString).join(''));
                    }
                    break;
                case "WarningDirective":
                    if (token.message.every(isValueType)) {
                        yield new Message(LEVEL_WARN, token.location, token.message.map(asString).join(''));
                    }
                    break;
                case "FailureDirective":
                    if (token.message.every(isValueType)) {
                        yield new Message(LEVEL_FATAL, token.location, token.message.map(asString).join(''));
                    }
                    break;

                case "NameDirective":
                    // This is discarded, as it is not useful to me
                    break;

                default:
                    yield token;
            }
        } catch (msg) {
            if (msg instanceof Message) {
                yield msg;
            } else if (msg instanceof Error) {
                throw msg;
            } else {
                yield new Message(LEVEL_FATAL, token.location, msg);
            }
        }
    }
}

module.exports = {
    finalize
}
