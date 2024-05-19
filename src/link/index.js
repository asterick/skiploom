function linker(blocks, exports) {
    console.log(exports);
    console.log(blocks);
    process.exit(-1);
}

module.exports = {
    linker
};
