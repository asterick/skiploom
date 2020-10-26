const { resolve } = require("../util/resolve.js");
const { sourceParser } = require("./parsers.js");

async function assemble(path, loader = 'text.loader.js') {
    // Import our source transform
    loader = require(await resolve(loader));

    // Parse our sourcecode
    const parser = sourceParser();
    for await (let chunk of loader(path)) {
        parser.feed(chunk);
    }

    // TODO: PASS 1
}

module.exports = assemble;
