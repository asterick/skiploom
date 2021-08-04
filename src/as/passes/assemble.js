const { passes } = require("./index.js")

const {
    LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO,
    Message
} = require ("../../util/logging.js");

async function* lazy(pass, ctx, feed) {
    let blocks = [];

    // Run through entire scope before lazy evaluating tree
    for await (let block of feed) {
        if (block instanceof Message) {
            yield block;
            continue ;
        }

        blocks.push(block);
    }

    yield* pass(ctx, blocks);
}

async function* assemble(ctx, tree, warn = true) {
    // Run through the various passes
    tree = passes.evaluate(ctx, tree);
    tree = passes.localize(ctx, tree);
    tree = lazy(passes.evaluate, ctx, tree);
    tree = passes.localize(ctx, tree);          // This simply reruns against IF statements
    tree = passes.macro(ctx, tree);
    tree = passes.finalize(ctx, tree);

    // Pass through the results
    yield* tree;

    // If context has not been scoped, we need to simply move on
    if (!warn) return ;

    // We've finished up, now start complaining about floating values
    for (const name of ctx.nearVariables()) {
        const variable = ctx.get(name);

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
