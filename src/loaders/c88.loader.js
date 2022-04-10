const { sourceParser } = require("../as/parsers.js");
const { execFileSync } = require('child_process');
const path = require("path");

const {
    LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO,
    Message
} = require ("../util/logging.js");

const COMPILER_EXECUTABLE = path.join(__dirname, "../../bin/C88.EXE");

// Export AST chunks
async function* defaultLoader(source_location, path, args) {
    const prior_location = global.parser_source;
    const parser = sourceParser();

    try {
        let stdout = execFileSync(COMPILER_EXECUTABLE, ['-n', '-Ml', path]);
        global.parser_source = source_location;
        parser.feed(stdout.toString('utf-8'));
        parser.feed("\n");
        global.parser_source = prior_location;
    } catch(e) {
        yield new Message(LEVEL_FATAL, "null", `C compiler error: ${e.toString()}`);
        return ;
    }

    yield *parser.results[0];
}

module.exports = defaultLoader;
