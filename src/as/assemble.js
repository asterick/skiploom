const {
    isValueType, isNumber, autoType,
    asNumber, asString, asTruthy, asName,
} = require("./helper.js");

const { lookup, Arguments, Instructions } = require("../util/table.js");
const { LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO, Message } = require ("../util/logging.js");

function lookup_indirect_register(op_name, register, offset) {
    if (register.type == "Register" && register.register == "BR") {
        if (offset.type == "Number") {
            return [ Arguments.MEM_BR, offset ];
        } else {
            // TODO: Lazy evaluate
            return null
        }
    } else {
        throw `Cannot perform indirect register offset access`;
    }
}

function lookup_indirect_offset(param, op, left, right) {
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
        if (op == "Subtract") {
            if (right.type == "Number") {
                // Negate value simply
                right = { ... right, value: -right.value };
            } else {
                // Negate value for deferred execution
                right = {
                    type: "UnaryOperator",
                    op: "Negate",
                    location: right.location,
                    value: right
                };
            }
        } else if (op != "Add") {
            throw `Invalid offset operation ${op}`;
        }

        switch (left.register) {
            case "SP": return [ Arguments.MEM_SP_DISP, right ];
            case "IX": return [ Arguments.MEM_IX_DISP, right ];
            case "IY": return [ Arguments.MEM_IY_DISP, right ];
            default:
                throw `Cannot index register ${left.register}`;
        }
    }
}

function lookup_indirect(op_name, param) {
    switch (param.type) {
    case "Register":
        switch(param.register) {
        case "HL": return [ Arguments.MEM_HL, null ];
        case "IX": return [ Arguments.MEM_IX, null ];
        case "IY": return [ Arguments.MEM_IY, null ];
        default:
            throw `Cannot access memory with register ${param.register}`;
        }

    case "BinaryOperation":
        if (param.left.type == "Register") {
            return lookup_indirect_offset(op_name, param.op, param.left, param.right);
        }
        // Fallthrough to an absolute address

    case "Number":
        if (op_name == "JP") {
            return [ Arguments.MEM_VECTOR, param ];
        } else {
            return [ Arguments.MEM_ABS, param ];
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
        return [ Arguments.IMM, param ];
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

        for (let [idx, imm] of Object.entries(imms)) {
            const type = op.immediates[idx];
            let result;

            if (imm.type == "Number") {
                const value = asNumber(imm);

                switch (type.size) {
                    case 1:
                        result = new (type.signed ? Int8Array : Uint8Array)([value]);
                        break ;
                    case 2:
                        result = new (type.signed ? Int16Array : Uint16Array)([value]);
                        break ;
                }

                if (result[0] != value) {
                    yield new Message(LEVEL_WARN, imm.location, `Value ${value} cannot fit inside ${type.signed ? "signed " : ""}${(type.size == 1) ? "byte" : "word"}`)
                }

                result = result.buffer;
            } else {
                result = {
                    type: "RawValueDirective",
                    value: imm,
                    signed: type.signed,
                    size: type.signed,
                    location: imm.location
                };
            }

            yield result;
        }
    } else {
        yield table[0].code.buffer;
    }
}

module.exports = {
    assemble
}
