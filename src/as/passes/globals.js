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

async function* globals(scope, feed) {
    for await (let token of feed) {
        if (token instanceof Message) {
            yield token;
            continue ;
        }

        try {
            switch (token.type) {
            // Global Directives
            case "GlobalDirective":
                for (const name of token.names.map(asName)) {
                    scope.global(name).location = token.location;
                }
                continue ;

            case "ExternDirective":
                for (const name of token.names.map(asName)) {
                    const variable = scope.global(name);
                    variable.location = token.locaiton;

                    for (const attr in token.attributes) {
                        if (variable[attr] && variable[attr] != token.attributes[attr]) {
                            throw new Message(LEVEL_FAIL, token.location, `Variable ${name} already defines ${attr} property as ${variable[attr]}`)
                        }

                        variable[attr] = token.attributes[attr];
                    }
                }
                continue ;

            case "DefineSectionDirective":
                yield new Message(LEVEL_FAIL, token.location, `Unhandled directive (pass: globals) ${token.type}`);
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
    globals
};
