const {
    isValueType, autoType,
    asNumber, asString, asTruthy, asName,
} = require("../helper.js");

const { LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO, Message } = require ("../../util/logging.js");

const encoder = new TextEncoder();

function* TypedDataBlock({ type, data }, cast, array) {
    let start = 0;

    while (start < data.length) {
        // Find ranges
        let range_start = start;
        while (range_start < data.length && !isValueType(data[range_start])) range_start++;
        let range_end = range_start;
        while (range_end < data.length && isValueType(data[range_end])) range_end++;

        // Cast off unevaluated stuff
        if (start != range_start) {
            const slice = data.slice(start, range_start);

            yield {
                type,
                data: slice,
                location: slice[0].location
            };
        }

        // Emit typed arrays for remaining data
        const slice = data.slice(range_start, range_end).map(cast);
        if (array) {
            const arr = new array(slice);
            for (let i = 0; i < slice.length; i++) {
                if (arr[i] != slice[i]) {
                    yield new Message(LEVEL_WARN, data[i+range_start].location, `Value ${slice[i]} truncated to ${arr[i]}`);
                }
            }

            yield arr;
        } else {
            yield* slice;
        }

        start = range_end;
    }
}

async function* finalize(scope, tree) {
    for await (let token of tree) {
        if (token instanceof Message) {
            yield token;
            continue ;
        }

        try {
            switch (token.type) {
            // Termination cases
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

            case "AsciiBlockDirective":
                yield* TypedDataBlock(token, (v) => encoder.encode(asString(v)));
                break ;
            case "TerminatedAsciiBlockDirective":
                yield* TypedDataBlock(token, (v) => encoder.encode(asString(v) + '\0'));
                break ;
            case "DataBytesDirective":
                yield* TypedDataBlock(token, asNumber, Uint8Array);
                break ;
            case "DataWordsDirective":
                yield* TypedDataBlock(token, asNumber, Uint16Array);
                break ;

            // These are the unimplemented bits
            case "DataAllocateDirective":
            case "DispatchDirective":
            case "SectionDirective":
            case "AlignDirective":
            case "NameDirective":
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
