const fs = require("fs").promises;
const path = require("path");

const Arguments = {
    // Conditions
    LESS_THAN: 0x40,
    LESS_EQUAL: 0x41,
    GREATER_THAN: 0x42,
    GREATER_EQUAL: 0x43,
    OVERFLOW: 0x44,
    NOT_OVERFLOW: 0x45,
    POSITIVE: 0x46,
    MINUS: 0x47,
    CARRY: 0x48,
    NOT_CARRY: 0x49,
    ZERO: 0x4A,
    NOT_ZERO: 0x4B,
    SPECIAL_FLAG_0: 0x50,
    SPECIAL_FLAG_1: 0x51,
    SPECIAL_FLAG_2: 0x52,
    SPECIAL_FLAG_3: 0x53,
    NOT_SPECIAL_FLAG_0: 0x54,
    NOT_SPECIAL_FLAG_1: 0x55,
    NOT_SPECIAL_FLAG_2: 0x56,
    NOT_SPECIAL_FLAG_3: 0x57,

    // Arguments
    REG_A: 0x01,
    REG_B: 0x02,
    REG_L: 0x03,
    REG_H: 0x04,
    REG_BA: 0x05,
    REG_HL: 0x06,
    REG_IX: 0x07,
    REG_IY: 0x08,
    REG_NB: 0x09,
    REG_BR: 0x0A,
    REG_EP: 0x0B,
    REG_IP: 0x0C,
    REG_XP: 0x0D,
    REG_YP: 0x0E,
    REG_SC: 0x0F,
    REG_SP: 0x10,
    REG_PC: 0x11,
    REG_ALL: 0x12,
    REG_ALE: 0x13,

    MEM_HL: 0x20,
    MEM_IX: 0x21,
    MEM_IY: 0x22,
    MEM_IX_OFF: 0x23,
    MEM_IY_OFF: 0x24,
    MEM_SP_DISP: 0x25,
    MEM_IX_DISP: 0x26,
    MEM_IY_DISP: 0x27,
    MEM_BR: 0x28,
    MEM_ABS: 0x29,

    IMM: 0x30
}

const ArgumentsTypes = {
    // Conditions
    "LT": [Arguments.LESS_THAN],
    "LE": [Arguments.LESS_EQUAL],
    "GT": [Arguments.GREATER_THAN],
    "GE": [Arguments.GREATER_EQUAL],
    "V": [Arguments.OVERFLOW],
    "NV": [Arguments.NOT_OVERFLOW],
    "P": [Arguments.POSITIVE],
    "M": [Arguments.MINUS],
    "C": [Arguments.CARRY],
    "NC": [Arguments.NOT_CARRY],
    "Z": [Arguments.ZERO],
    "NZ": [Arguments.NOT_ZERO],
    "F0": [Arguments.SPECIAL_FLAG_0],
    "F1": [Arguments.SPECIAL_FLAG_1],
    "F2": [Arguments.SPECIAL_FLAG_2],
    "F3": [Arguments.SPECIAL_FLAG_3],
    "NF0": [Arguments.NOT_SPECIAL_FLAG_0],
    "NF1": [Arguments.NOT_SPECIAL_FLAG_1],
    "NF2": [Arguments.NOT_SPECIAL_FLAG_2],
    "NF3": [Arguments.NOT_SPECIAL_FLAG_3],

    // Arguments
    "ALL": [Arguments.REG_ALL],
    "ALE": [Arguments.REG_ALE],

    "A": [Arguments.REG_A],
    "B": [Arguments.REG_B],
    "L": [Arguments.REG_L],
    "H": [Arguments.REG_H],

    "BA": [Arguments.REG_BA],
    "HL": [Arguments.REG_HL],
    "IX": [Arguments.REG_IX],
    "IY": [Arguments.REG_IY],

    "NB": [Arguments.REG_NB],
    "BR": [Arguments.REG_BR],
    "EP": [Arguments.REG_EP],
    "IP": [Arguments.REG_IP],
    "XP": [Arguments.REG_XP],
    "YP": [Arguments.REG_YP],
    "SC": [Arguments.REG_SC],

    "SP": [Arguments.REG_SP],
    "PC": [Arguments.REG_PC],

    "[HL]": [Arguments.MEM_HL],
    "[IX]": [Arguments.MEM_IX],
    "[IY]": [Arguments.MEM_IY],
    "[IX+L]": [Arguments.MEM_IX_OFF],
    "[IY+L]": [Arguments.MEM_IY_OFF],
    "[SP+dd]": [Arguments.MEM_SP_DISP, { size: 1, signed: true }],
    "[IX+dd]": [Arguments.MEM_IX_DISP, { size: 1, signed: true }],
    "[IY+dd]": [Arguments.MEM_IY_DISP, { size: 1, signed: true }],
    "[BR:ll]": [Arguments.MEM_BR, { size: 1, signed: false }],
    "[kk]": [Arguments.MEM_ABS, { size: 1, signed: false }],
    "[hhll]": [Arguments.MEM_ABS, { size: 2, signed: false }],

    "rr": [Arguments.IMM, { size: 1, signed: true }],
    "qqrr": [Arguments.IMM, { size: 2, signed: true }],
    "#nn": [Arguments.IMM, { size: 1, signed: false }],
    "#mmnn": [Arguments.IMM, { size: 2, signed: false }],
};

const Instructions = {};

function format(code, op, arg1, arg2) {
    if (!Instructions[op]) Instructions[op] = {};

    arg1 = ArgumentsTypes[arg1];
    arg2 = ArgumentsTypes[arg2];

    const immediates = [];
    let key = 0;

    if (arg1) {
        const [code, imm] = arg1;
        key += code;
        if (imm) immediates.push(imm)
    }

    if (arg2) {
        const [code, imm] = arg2;
        key += code * 0x100;
        if (imm) immediates.push(imm)
    }

    Instructions[op][key] = { code, immediates }
}

async function generate() {
    const inst_table = fs.readFile(path.join(__dirname, "s1c88.csv"), 'utf-8');

    for (const line of (await inst_table).split(/[\r\n]+/)) {
        const [
            opcode,
            _1, xx_code, xx_arg1, xx_arg2,
            _2, ce_code, ce_arg1, ce_arg2,
            _3, cf_code, cf_arg1, cf_arg2,
        ] = line.split(",");

        let byte = parseInt(opcode, 16)

        if (xx_code) format(new Uint8Array([byte]).buffer, xx_code, xx_arg1, xx_arg2);
        if (ce_code) format(new Uint8Array([0xCE, byte]).buffer, ce_code, ce_arg1, ce_arg2);
        if (cf_code) format(new Uint8Array([0xCF, byte]).buffer, cf_code, cf_arg1, cf_arg2);
    }

    console.log(Instructions);
}

function lookup(arg1 = 0, arg2 = 0) {
    return arg1 + arg2 * 0x100;
}

module.exports = {
    Arguments, Instructions, lookup, generate
};
