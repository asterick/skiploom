const { passes } = require("./index.js")

const {
    LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO,
    Message
} = require ("../../util/logging.js");

async function* assemble(scope, tree, warn = true) {
    // Run through the various passes
    tree = passes.evaluate(scope, tree);
    tree = passes.localize(scope, tree);
    tree = passes.lazy_evaluate(scope, tree);

    // Pass through the results
    yield* tree;

    // If context has not been scoped, we need to simply move on
    if (!warn) return ;

    // We've finished up, now start complaining about floating values
    for (const name in scope.top) {
        if (!scope.top.hasOwnProperty(name)) {
            continue ;
        }

        const variable = scope.get(name);

        if (!variable.used) {
            if (!variable.value) {
                yield new Message(LEVEL_WARN, variable.location, `Unused identifier ${name}`);
            } else {
                yield new Message(LEVEL_WARN, variable.location, `Local variable ${name} is defined, but is never used`);
            }
        } else if (!variable.value) {
            yield new Message(LEVEL_FAIL, variable.location, `Local variable ${name} is used, but is never defined`);
        }
    }
}

module.exports = {
    assemble
}
