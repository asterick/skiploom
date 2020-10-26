#!/usr/bin/env node
const yargs = require('yargs/yargs');

const argv = yargs(process.argv.slice(2))
    .usage('Usage: $0 <command> [options]')    
    .help('h')
    //.boolean(['r','v'])
    .argv
    ;

console.dir(argv);
