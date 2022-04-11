const fs = require("fs/promises");
const constants = require("fs").constants;
const path = require("path");

// By default, load relative to source file
// followed by library and loaders
const searchPaths = ['../../lib', '../loaders'].map((p) => path.join(__dirname, p));

async function resolve(fn, relative = process.cwd()) {
    // Absolute path, simply perform stat
    if (/^[\\/]/.exec(fn)) {
        try {
            const stat = await fs.stat(fn);
            return { filename: fn, stat }
        } catch(e) {
            return { stat: null }
        }
    }

    // Relative path, attempt to find
    for (let root of [relative, ... searchPaths]) {
        const filename = path.join(root,fn);

        try {
            const stat = await fs.stat(filename);
            return { filename, stat };
        } catch (e) {
            continue ;
        }
    }

    return { stat: null };
}

module.exports = {
    searchPaths,
    resolve
};
