const {
    isValueType, isNumber, autoType,
    asNumber, asString, asTruthy, asName,
} = require("./helper.js");

const { lookup, Arguments, Instructions } = require("../util/table.js");
const { LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO, Message } = require ("../util/logging.js");

function as(type, v) {
    const array = new type([v]);

    if (v != array[0]) {
        throw `${v} is too large of a constant`
    }

    return array;
}

function lookup_indirect_register(op_name, register, offset) {
    if (register.type == "Register" && register.register == "BR") {
        if (offset.type == "Number") {
            return [ Arguments.MEM_BR, offset.value ];
        } else {
            // TODO: Lazy evaluate
            return null
        }
    } else {
        throw `Cannot perform indirect register offset access`;
    }
}

function lookup_indirect_offset(param, op, left, right) {
    if (left.type != "Register") {
        // TODO: Deferred based absolute address
        return null;
    }

    if (right.type == "Register") {
        if (op != "Add") {
            throw `Invalid offset operation ${op}`;
        }

        if (right.register != "L") {
            throw `Cannot offset index register ${right.register}`;
        }

        switch (left.register) {
            case "IX": return [ Arguments.MEM_IX_OFF, null ];
            case "IY": return [ Arguments.MEM_IY_OFF, null ];
            default:
                throw `Cannot index register ${left.register}`;
        }
    } else {
        if (op != "Add" && op != "Subtract") {
            throw `Invalid offset operation ${op}`;
        } else if (right.type != "Number") {
            // TODO: Deferred offset evaluation
            return null;
        }

        switch (left.register) {
            case "SP": return [ Arguments.MEM_SP_DISP, as(Int8Array, op == "Add" ? right.value : -right.value) ];
            case "IX": return [ Arguments.MEM_IX_DISP, as(Int8Array, op == "Add" ? right.value : -right.value) ];
            case "IY": return [ Arguments.MEM_IY_DISP, as(Int8Array, op == "Add" ? right.value : -right.value) ];
            default:
                throw `Cannot index register ${left.register}`;
        }
    }
}

function lookup_indirect(op_name, param) {
    switch (param.type) {
    case "BinaryOperation":
        return lookup_indirect_offset(op_name, param.op, param.left, param.right);
    case "Register":
        switch(param.register) {
        case "HL": return [ Arguments.MEM_HL, null ];
        case "IX": return [ Arguments.MEM_IX, null ];
        case "IY": return [ Arguments.MEM_IY, null ];
        default:
            throw `Cannot access memory with register ${param.register}`;
        }
    case "Number":
        if (op_name == "JP") {
            return [ Arguments.MEM_VECTOR, as(Uint8Array, param.value) ];
        } else {
            return [ Arguments.MEM_ABS, as(Uint16Array, param.value) ];
        }
    }

    return null;
}

function lookup_param(op_name, param) {
    switch(param.type) {
    case "IndirectRegisterOffset":
        return lookup_indirect_register(op_name, param.register, param.offset);
    case "IndirectMemory":
        return lookup_indirect(op_name, param.address);
    case "Number":
        return [ Arguments.IMM, param.value ];
    case "Register":
        switch (param.register) {
        case   "A": return [ Arguments.REG_A, null ];
        case   "B": return [ Arguments.REG_B, null ];
        case   "L": return [ Arguments.REG_L, null ];
        case   "H": return [ Arguments.REG_H, null ];
        case  "BA": return [ Arguments.REG_BA, null ];
        case  "HL": return [ Arguments.REG_HL, null ];
        case  "IX": return [ Arguments.REG_IX, null ];
        case  "IY": return [ Arguments.REG_IY, null ];
        case  "NB": return [ Arguments.REG_NB, null ];
        case  "BR": return [ Arguments.REG_BR, null ];
        case  "EP": return [ Arguments.REG_EP, null ];
        case  "IP": return [ Arguments.REG_IP, null ];
        case  "XP": return [ Arguments.REG_XP, null ];
        case  "YP": return [ Arguments.REG_YP, null ];
        case  "SC": return [ Arguments.REG_SC, null ];
        case  "SP": return [ Arguments.REG_SP, null ];
        case  "PC": return [ Arguments.REG_PC, null ];
        case "ALL": return [ Arguments.REG_ALL, null ];
        case "ALE": return [ Arguments.REG_ALE, null ];
        default:
            throw `Cannot match register ${param.register}`;
        }
    case "Condition":
        switch (param.condition) {
            case  "LT": return [ Arguments.LESS_THAN, null ];
            case  "LE": return [ Arguments.LESS_EQUAL, null ];
            case  "GT": return [ Arguments.GREATER_THAN, null ];
            case  "GE": return [ Arguments.GREATER_EQUAL, null ];
            case   "V": return [ Arguments.OVERFLOW, null ];
            case  "NV": return [ Arguments.NOT_OVERFLOW, null ];
            case   "P": return [ Arguments.POSITIVE, null ];
            case   "M": return [ Arguments.MINUS, null ];
            case   "C": return [ Arguments.CARRY, null ];
            case  "NC": return [ Arguments.NOT_CARRY, null ];
            case   "Z": return [ Arguments.ZERO, null ];
            case  "NZ": return [ Arguments.NOT_ZERO, null ];
            case  "F0": return [ Arguments.SPECIAL_FLAG_0, null ];
            case  "F1": return [ Arguments.SPECIAL_FLAG_1, null ];
            case  "F2": return [ Arguments.SPECIAL_FLAG_2, null ];
            case  "F3": return [ Arguments.SPECIAL_FLAG_3, null ];
            case "NF0": return [ Arguments.NOT_SPECIAL_FLAG_0, null ];
            case "NF1": return [ Arguments.NOT_SPECIAL_FLAG_1, null ];
            case "NF2": return [ Arguments.NOT_SPECIAL_FLAG_2, null ];
            case "NF3": return [ Arguments.NOT_SPECIAL_FLAG_3, null ];
            default:
                throw `Cannot match condition ${param.condition}`;
        }
    }

    return null;
}

function* assemble(token) {
    const { call, parameters } = token;

    const op_name = asName(call).toUpperCase();
    const table = Instructions[op_name];

    if (!table) {
        throw `Unknown instruction name ${op_name}`;
    }

    if (parameters) {
        const key = [];
        const imms = []

        // Validate the argument
        for (let p of parameters) {
            const output = lookup_param(op_name, p);
            if (!output) {
                yield token;
                return ;
            }

            const [arg, data] = output;
            key.push(arg);
            if (data !== null) imms.push(data);
        }

        // Determine if instruction is legal
        const op = table[lookup(... key)]
        if (!op) {
            throw `Illegal instruction`;
        }

        // Emit our opcode
        yield op.code.buffer;
        for (let imm of imms) {
            if (typeof imm == "number") {
                switch (op.size) {
                    case 8:
                        imm = as(op.signed ? Int8Array : Uint8Array, imm);
                        break ;
                    case 16:
                        imm = as(op.signed ? Int16Array : Uint16Array, imm);
                        break ;
                }
            }

            yield imm.buffer;
        }
    } else {
        yield table[0].code.buffer;
    }
}

module.exports = {
    assemble
}
