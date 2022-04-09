const {
    isValueType, isNumber, autoType,
    asNumber, asString, asTruthy, asName,
} = require("../helper.js");

const { lookup, Arguments, Instructions } = require("../../util/table.js");
const { LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO, Message } = require ("../../util/logging.js");

const JUMP_TYPES = {
    'JRS': { type: 'BranchDirective', call: false, size: "Short" },
    'JRL': { type: 'BranchDirective', call: false, size: "Long" },
    'CARS': { type: 'BranchDirective', call: true, size: "Short" },
    'CARL': { type: 'BranchDirective', call: true, size: "Long" },
};

async function* advanced_jump(ctx, tree) {
    let skip_next = false;

    for await (let token of tree) {
        if (token instanceof Message) {
            yield token;
            continue ;
        }

        try {
            switch (token.type) {
            case 'DispatchDirective':
                // Treat any NB altering instruction as a trap
                if (token.call.type == 'Identifier' &&
                    token.call.name.toUpperCase() == 'LD' &&
                    token.parameters.length == 2 &&
                    token.parameters[0].type == 'Register' &&
                    token.parameters[0].name == 'NB' ) {
                    skip_next = true;
                    yield token;
                    continue ;
                }

                // Avoid processing any instruction following a jump as dynamic
                if (skip_next) {
                    skip_next = false;
                    yield token;
                    continue ;
                }

                // We only care about variable length jumps
                if (JUMP_TYPES[token.call.name] === undefined) {
                    yield token;
                    continue ;
                }

                let condition = null,
                target;

               if (token.parameters.length == 2 &&
                    token.parameters[0].type == 'Condition' &&
                    (token.parameters[1].type == 'Identifier' || token.parameters[1].type == 'Fragment')) {
                    [ condition, target ] = token.parameters;
                } else if (token.parameters.length == 1 &&
                    (token.parameters[0].type == 'Identifier' || token.parameters[0].type == 'Fragment')) {
                    [ target ] = token.parameters;
                } else {
                    // This is a format we do not abide
                    yield token;
                    continue ;
                }

                // Emit a naked jump/call for the linker
                yield {
                    location: token.location,
                    ... JUMP_TYPES[token.call.name],
                    location: token.location,
                    target, condition
                };
                break ;

            default:
                // This is an unprocessed directive, clear jump detection
                skip_next = false;
                yield token;
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
}

module.exports = {
    advanced_jump
}
