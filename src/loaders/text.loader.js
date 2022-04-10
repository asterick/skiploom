const { sourceParser } = require("../as/parsers.js");
const fs = require('fs').promises;

// Export AST chunks
async function* defaultLoader(source_location, path, args) {
    const prior_location = global.parser_source;
    // Parse our sourcecode
    const parser = sourceParser();

    global.parser_source = source_location;
    parser.feed(await fs.readFile(path, { encoding: 'utf-8' }));
    parser.feed("\n");
    global.parser_source = prior_location;

    yield *parser.results[0];
}

module.exports = defaultLoader;
