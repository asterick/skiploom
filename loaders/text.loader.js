const fs = require('fs').promises;

async function* defaultLoader(path) {
    yield await fs.readFile(path, { encoding: 'utf-8' });
}

module.exports = defaultLoader;
