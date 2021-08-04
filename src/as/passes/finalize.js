const {
    isValueType, autoType,
    asNumber, asString, asTruthy, asName,
} = require("../helper.js");

const { LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO, Message } = require ("../../util/logging.js");

async function* finalize(scope, tree) {
    for await (let token of tree) {
        if (token instanceof Message) {
            yield token;
            continue ;
        }

        try {
            switch (token.type) {
            // Failure cases
            case "EndDirective":
                // This terminates the assembler, so discard anything that comes after
                // bubble up so it terminates through all scopes
                yield token;
                return ;
            case "ExitMacroDirective":
                yield new Message(LEVEL_FAIL, token.location, "Misplaced EXITM, Must be used inside of a macro");
                return ;

            // Display directives
            case "MessageDirective":
                if (token.message.every(isValueType)) {
                    yield new Message(LEVEL_INFO, token.location, token.message.map(asString).join(''));
                    return ;
                }
                break ;
            case "WarningDirective":
                if (token.message.every(isValueType)) {
                    yield new Message(LEVEL_WARN, token.location, token.message.map(asString).join(''));
                }
                break ;
            case "FailureDirective":
                if (token.message.every(isValueType)) {
                    yield new Message(LEVEL_FATAL, token.location, token.message.map(asString).join(''));
                }
                break ;

            case "DispatchDirective":
            case "SectionDirective":
            case "AlignDirective":
            case "NameDirective":
            case "AsciiBlockDirective":
            case "TerminatedAsciiBlockDirective":
            case "DataBytesDirective":
            case "DataWordsDirective":
            case "DataAllocateDirective":
            case "DefineSectionDirective":
            case "Fragment":
                yield new Message(LEVEL_FAIL, token.location, `Unhandled directive (pass: finalize) ${token.type}`);

            default:
                yield token ;
            }
        } catch(msg) {
            if (msg instanceof Message) {
                yield msg;
            } else if(msg instanceof Error) {
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