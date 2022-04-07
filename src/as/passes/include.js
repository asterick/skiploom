const path = require("path");
const { resolve } = require("../../util/resolve.js");

const {
    LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO,
    Message
} = require ("../../util/logging.js");

async function* include (location, target, module = 'text.loader.js') {
    // Import our source transform
    const fn = await resolve(target, location.path && path.dirname(location.path));
    let loader;

    try {
        loader = require(await resolve(module));
    } catch(e) {
        yield new Message(LEVEL_FATAL, null, `Cannot resolve loader: ${module}`);
        return ;
    }

    // Isolate our namespace
    const source_location = {
        source: "include",
        loader: module,
        path: fn,
        parent: location
    };

    // Output a dependancy marker for the include
    yield {
        type: "Dependancy",
        source: "include",
        filename: fn
    }

    // Tag all our outbound blocks as being from this process
    for await (let block of loader(fn)) {
        if (block instanceof Message) {
            yield block;
            continue ;
        }

        Object.assign(block.location, source_location);

        yield block;
    }
}

module.exports = { include };
