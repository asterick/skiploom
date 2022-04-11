const fs = require("fs/promises");

async function load(fn) {
    const fin = await fs.open(fn, "r");
    console.log(fin.read(4));
    
    await fin.close();
}

async function save(fn, object) {
    const fout = await fs.open(fn, "w");
    
    // Test
    fout.write("\x00OBJ");
    await fout.close();
}

module.exports = {
    load, save
};
