const fs = require("fs").promises;
const constants = require("fs").constants;
const path = require("path");

const searchPaths = [path.join(__dirname, '../loaders')];

async function resolve(fn, relative = process.cwd()) {
    // These are relative to current path
    if (fn[0] == '.') {
        return path.join(relative, fn);
    }

    // Absolute path
    if (/$[\\/]/.exec(fn[0])) {
        return fn;
    }

    for (let root of searchPaths) {
        const target = path.join(root,fn);
        try {
            await fs.access(target, constants.F_OK);
            return target;
        } catch (e) {
            continue ;
        }
    }

    return null;
}

module.exports = {
    searchPaths,
    resolve
};
