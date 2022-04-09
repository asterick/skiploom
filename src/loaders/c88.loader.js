const { sourceParser } = require("../as/parsers.js");
const { execFileSync } = require('child_process');
const path = require("path");

const {
    LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO,
    Message
} = require ("../util/logging.js");

const COMPILER_EXECUTABLE = path.join(__dirname, "../../bin/C88.EXE");

// Export AST chunks
async function* defaultLoader(location, path, args) {
    const parser = sourceParser();

    try {
        let stdout = execFileSync(COMPILER_EXECUTABLE, ['-n', '-Ml', path]);
        parser.feed(stdout.toString('utf-8'));
        parser.feed("\n");
    } catch(e) {
        yield new Message(LEVEL_FATAL, "null", `C compiler error: ${e.toString()}`);
        return ;
    }

    for (const token of parser.results[0]) {
        yield { ... token, location };
    }
}

module.exports = defaultLoader;
