const { resolve } = require("../util/resolve.js");
const { expressionParser, sourceParser } = require("./parsers.js");

/* This creates a namespace of defines */
function defines(... pairs) {
    return pairs.reduce((acc, define) => {
        const match = /^([a-z_][a-z0-9_]*)(=(.*))?$/.exec(define);
        if (!match) {
            throw new Error(`Malformed define: ${define}`);
        }

        let[,key,,value] = match;

        global.parseSource = {
            source: "command-line",
            path: key
        }

        if (typeof value != 'undefined') {
            try {
                const parser = expressionParser();
                parser.feed(value);
                acc[key] = { type: 'define', value: parser.results };
            } catch(e) {
                throw new Error(`Malformed define: ${value}`);
            }
        } else {
            acc[key] = { type: 'define', value: { type: 'Number', value: 1 } };
        }

        return acc;
    }, {});
}

async function assembleFile(namespace, path, loader = 'text.loader.js') {
    // Isolate our namespace
    namespace = Object.create(namespace);

    // Import our source transform
    loader = require(await resolve(loader));

    // Parse our sourcecode
    const parser = sourceParser();
    for await (let chunk of loader(path)) {
        parser.feed(chunk);
    }

    console.log(parser.results)

    // TODO: PASS 1
    return ;
}

async function assemble({ files, define }) {
    const namespace = defines(... define);

    global.parseSource = {
        source: "command-line"
    }

    for (let fn of files) {
        const file = assembleFile(namespace, fn);
        // TODO: bundle here
    }

    return null;
}

module.exports = {
    defines,
    assemble
};
