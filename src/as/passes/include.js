const path = require("path");
const { resolve } = require("../../util/resolve.js");

const {
    LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO,
    Message
} = require ("../../util/logging.js");

async function* include (location, target, module = 'text.loader.js') {
    const querystring = module.indexOf("?");
    let args = null;

    if (querystring >= 0) {
        args = new URLSearchParams(module.substring(querystring+1));
        module = module.substring(0, querystring);
    }

    let { filename, stat } = await resolve(module);

    if (!stat) {
        yield new Message(LEVEL_FATAL, null, `Cannot resolve loader: ${module}`);
        return ;
    }

    const loader = require(filename);

    // Import our source transform
    ({ filename, stat } = await resolve(target, location.path && path.dirname(location.path)));

    if (!stat) {
        yield new Message(LEVEL_FATAL, null, `Cannot locate file: ${target}`);
        return ;
    }

    // Isolate our namespace
    const source_location = {
        source: "include",
        loader: module,
        path: filename,
        parent: location
    };

    // Output a dependancy marker for the include
    yield {
        type: "Dependancy",
        source: "include",
        filename, stat
    };

    // Tag all our outbound blocks as being from this process
    for await (let block of loader(source_location, filename, args)) {
        if (block instanceof Message) {
            yield block;
            continue ;
        }

        yield block;
    }
}

module.exports = { include };
