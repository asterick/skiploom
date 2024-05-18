const {
    isValueType, isNumber, autoType,
    asNumber, asString, asTruthy, asName,
} = require("../helper.js");

const { lookup, Arguments, Instructions } = require("../../util/table.js");
const { LEVEL_FATAL, LEVEL_FAIL, LEVEL_WARN, LEVEL_INFO, Message } = require("../../util/logging.js");

function lookup_indirect_offset(register, offset) {
    if (register.name !== "BR") {
        throw new Message(LEVEL_FAIL, register.location, `Invalid access base register ${register.name}`);
    }

    return [Arguments.MEM_BR, offset];
}

function lookup_indirect_displace(register, offset) {
    switch (register.name) {
        case "SP": return [Arguments.MEM_SP_DISP, offset];
        case "IX": return [Arguments.MEM_IX_DISP, offset];
        case "IY": return [Arguments.MEM_IY_DISP, offset];
        default:
            throw new Message(LEVEL_FAIL, register.location, `Invalid index register ${register.name}`);
    }
}

function lookup_indirect_index(register, index) {
    if (index.name !== "L") {
        throw new Message(LEVEL_FAIL, index.location, `Invalid access index register ${index.name}`);
    }

    switch (register.name) {
        case "IX": return [Arguments.MEM_IX_OFF, null];
        case "IY": return [Arguments.MEM_IY_OFF, null];
        default:
            throw new Message(LEVEL_FAIL, register.location, `Invalid base register ${register.name}`);
    }
}

function lookup_param(op_name, param) {
    switch (param.type) {
        default:
            return [Arguments.IMM, param];
        case "IndirectAbsolute":
            return [Arguments.MEM_ABS, param.address];
        case "IndirectRegister":
            switch (param.register.name) {
                case "HL": return [Arguments.MEM_HL, null];
                case "IX": return [Arguments.MEM_IX, null];
                case "IY": return [Arguments.MEM_IY, null];
                default:
                    throw new Message(LEVEL_FAIL, param.location, `Cannot access memory with register ${param.register.name}`);
            }
        case "IndirectRegisterIndex":
            return lookup_indirect_index(param.register, param.index);
        case "IndirectRegisterDisplace":
            return lookup_indirect_displace(param.register, param.displace);
        case "IndirectRegisterOffset":
            return lookup_indirect_offset(param.register, param.offset);
        case "Register":
            switch (param.name) {
                case "A": return [Arguments.REG_A, null];
                case "B": return [Arguments.REG_B, null];
                case "L": return [Arguments.REG_L, null];
                case "H": return [Arguments.REG_H, null];
                case "BA": return [Arguments.REG_BA, null];
                case "HL": return [Arguments.REG_HL, null];
                case "IX": return [Arguments.REG_IX, null];
                case "IY": return [Arguments.REG_IY, null];
                case "NB": return [Arguments.REG_NB, null];
                case "BR": return [Arguments.REG_BR, null];
                case "EP": return [Arguments.REG_EP, null];
                case "IP": return [Arguments.REG_IP, null];
                case "XP": return [Arguments.REG_XP, null];
                case "YP": return [Arguments.REG_YP, null];
                case "SC": return [Arguments.REG_SC, null];
                case "SP": return [Arguments.REG_SP, null];
                case "PC": return [Arguments.REG_PC, null];
                case "ALL": return [Arguments.REG_ALL, null];
                case "ALE": return [Arguments.REG_ALE, null];
                default:
                    throw new Message(LEVEL_FAIL, param.location, `Cannot match register ${param.name}`);
            }
        case "Condition":
            switch (param.name) {
                case "LT": return [Arguments.LESS_THAN, null];
                case "LE": return [Arguments.LESS_EQUAL, null];
                case "GT": return [Arguments.GREATER_THAN, null];
                case "GE": return [Arguments.GREATER_EQUAL, null];
                case "V": return [Arguments.OVERFLOW, null];
                case "NV": return [Arguments.NOT_OVERFLOW, null];
                case "P": return [Arguments.POSITIVE, null];
                case "M": return [Arguments.MINUS, null];
                case "C": return [Arguments.CARRY, null];
                case "NC": return [Arguments.NOT_CARRY, null];
                case "Z": return [Arguments.ZERO, null];
                case "NZ": return [Arguments.NOT_ZERO, null];
                case "F0": return [Arguments.SPECIAL_FLAG_0, null];
                case "F1": return [Arguments.SPECIAL_FLAG_1, null];
                case "F2": return [Arguments.SPECIAL_FLAG_2, null];
                case "F3": return [Arguments.SPECIAL_FLAG_3, null];
                case "NF0": return [Arguments.NOT_SPECIAL_FLAG_0, null];
                case "NF1": return [Arguments.NOT_SPECIAL_FLAG_1, null];
                case "NF2": return [Arguments.NOT_SPECIAL_FLAG_2, null];
                case "NF3": return [Arguments.NOT_SPECIAL_FLAG_3, null];
                default:
                    throw new Message(LEVEL_FAIL, param.location, `Cannot match condition ${param.condition}`);
            }
    }
}

function* assemble(token) {
    const { call, parameters } = token;

    const op_name = asName(call).toUpperCase();
    const table = Instructions[op_name];

    if (!table) {
        throw new Message(LEVEL_FAIL, token.location, `Illegal instruction ${op_name}`);
    }

    if (parameters) {
        const key = [];
        const imms = []

        // Create our key and immediate values
        for (let p of parameters) {
            const [arg, data] = lookup_param(op_name, p);
            key.push(arg);
            if (data !== null) imms.push(data);
        }

        // Determine if instruction is legal
        const op = table[lookup(...key)]
        if (!op) {
            throw new Message(LEVEL_FAIL, token.location, `Illegal instruction`);
        }

        // Emit our opcode
        yield op.code;

        for (let [idx, imm] of Object.entries(imms)) {
            const type = op.immediates[idx];
            let result;

            if (imm.type == "Number") {
                const value = asNumber(imm);

                switch (type.size) {
                    case 1:
                        result = new (type.signed ? Int8Array : Uint8Array)([value]);
                        break;
                    case 2:
                        result = new (type.signed ? Int16Array : Uint16Array)([value]);
                        break;
                }

                if (result[0] != value) {
                    yield new Message(LEVEL_WARN, imm.location, `Value ${value} cannot fit inside ${type.signed ? "signed " : ""}${(type.size == 1) ? "byte" : "word"}`)
                }

                result = result.buffer;
            } else {
                result = {
                    type: "RawValueDirective",
                    value: imm,
                    size: type.size,
                    signed: type.signed,
                    location: imm.location
                };
            }

            yield result;
        }
    } else {
        yield table[0].code;
    }
}

function* TypedDataBlock({ type, data }, cast, array) {
    let start = 0;

    while (start < data.length) {
        // Find ranges
        let range_start = start;
        while (range_start < data.length && !isValueType(data[range_start])) range_start++;
        let range_end = range_start;
        while (range_end < data.length && isValueType(data[range_end])) range_end++;

        // Cast off unevaluated stuff
        if (start != range_start) {
            const slice = data.slice(start, range_start);

            yield {
                type,
                data: slice,
                location: slice[0].location
            };
        }

        // Emit typed arrays for remaining data
        const slice = data.slice(range_start, range_end).map(cast);
        if (array) {
            const arr = new array(slice);
            for (let i = 0; i < slice.length; i++) {
                if (arr[i] != slice[i]) {
                    yield new Message(LEVEL_WARN, data[i + range_start].location, `Value ${slice[i]} truncated to ${arr[i]}`);
                }
            }

            yield arr;
        } else {
            yield* slice;
        }

        start = range_end;
    }
}

async function* instructions(ctx, tree) {
    for await (let token of tree) {
        if (token instanceof Message) {
            yield token;
            continue;
        }

        try {
            switch (token.type) {
                case "AsciiBlockDirective":
                    yield* TypedDataBlock(token, (v) => encoder.encode(asString(v)));
                    break;
                case "TerminatedAsciiBlockDirective":
                    yield* TypedDataBlock(token, (v) => encoder.encode(asString(v) + '\0'));
                    break;
                case "DataBytesDirective":
                    yield* TypedDataBlock(token, asNumber, Uint8Array);
                    break;
                case "DataWordsDirective":
                    yield* TypedDataBlock(token, asNumber, Uint16Array);
                    break;

                // These are the unimplemented bits
                case "DispatchDirective":
                    // Validate that this instruction is resolved
                    yield* assemble(token);
                    break;

                default:
                    yield token;
            }
        } catch (msg) {
            if (msg instanceof Message) {
                yield msg;
            } else if (msg instanceof Error) {
                throw msg;
            } else {
                yield new Message(LEVEL_FAIL, token.location, msg);
            }
        }
    }
}

module.exports = {
    instructions
}
