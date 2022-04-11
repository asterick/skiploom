const { resolve } = require("./resolve.js");
const fs = require("fs/promises");

class StreamDataView extends DataView 
{
    constructor(... args) {
        super(... args);

        this.position = 0;
    }
}

async function load(fn)
{
    const resolved = await resolve(fn);

    // Cannot find file
    if (!resolved.stat) return null;

    const fin = await fs.open(resolved.filename, "r");
    const data = new StreamDataView((await fin.read()).buffer.buffer);

    console.log(data.getInt32(0));

    return null;
}

async function save(fn, object)
{
    const fout = await fs.open(fn, "w");
 
    fout.write("\x88OBJ");
    //console.log(object);
 
    await fout.close();
}

module.exports = {
    load, save
};
