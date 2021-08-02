const { sourceParser } = require("../as/parsers.js");
const fs = require('fs').promises;

// Export AST chunks
async function* defaultLoader(path) {
    console.log(path)
    // Parse our sourcecode
    const parser = sourceParser();
    parser.feed(await fs.readFile(path, { encoding: 'utf-8' }));
    parser.feed("\n");

    for (const token of parser.results[0]) {
        yield token;
    }
}

module.exports = defaultLoader;
