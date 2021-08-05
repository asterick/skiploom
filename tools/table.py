from json import dumps
import os
import csv

ARGUMENTS = {
    # Conditions
    "LT": ("LESS_THAN", 0, None),
    "LE": ("LESS_EQUAL", 0, None),
    "GT": ("GREATER_THAN", 0, None),
    "GE": ("GREATER_EQUAL", 0, None),
     "V": ("OVERFLOW", 0, None),
    "NV": ("NOT_OVERFLOW", 0, None),
     "P": ("POSITIVE", 0, None),
     "M": ("MINUS", 0, None),
     "C": ("CARRY", 0, None),
    "NC": ("NOT_CARRY", 0, None),
     "Z": ("ZERO", 0, None),
    "NZ": ("NOT_ZERO", 0, None),

    "F0": ("SPECIAL_FLAG_0", 0, None),
    "F1": ("SPECIAL_FLAG_1", 0, None),
    "F2": ("SPECIAL_FLAG_2", 0, None),
    "F3": ("SPECIAL_FLAG_3", 0, None),
    "NF0": ("NOT_SPECIAL_FLAG_0", 0, None),
    "NF1": ("NOT_SPECIAL_FLAG_1", 0, None),
    "NF2": ("NOT_SPECIAL_FLAG_2", 0, None),
    "NF3": ("NOT_SPECIAL_FLAG_3", 0, None),

    # Arguments
    "ALL": ("REG_ALL", 0, None),
    "ALE": ("REG_ALE", 0, None),

    "A": ("REG_A", 0, None),
    "B": ("REG_B", 0, None),
    "L": ("REG_L", 0, None),
    "H": ("REG_H", 0, None),

    "BA": ("REG_BA", 0, None),
    "HL": ("REG_HL", 0, None),
    "IX": ("REG_IX", 0, None),
    "IY": ("REG_IY", 0, None),

    "NB": ("REG_NB", 0, None),
    "BR": ("REG_BR", 0, None),
    "EP": ("REG_EP", 0, None),
    "IP": ("REG_IP", 0, None),
    "XP": ("REG_XP", 0, None),
    "YP": ("REG_YP", 0, None),
    "SC": ("REG_SC", 0, None),

    "SP": ("REG_SP", 0, None),
    "PC": ("REG_PC", 0, None),

    "[HL]": ("MEM_HL", 0, None),
    "[IX]": ("MEM_IX", 0, None),
    "[IY]": ("MEM_IY", 0, None),
    "[IX+L]": ("MEM_IX_OFF", 0, None),
    "[IY+L]": ("MEM_IY_OFF", 0, None),
    "[SP+dd]": ("MEM_SP_DISP", 1, True),
    "[IX+dd]": ("MEM_IX_DISP", 1, True),
    "[IY+dd]": ("MEM_IY_DISP", 1, True),
    "[BR:ll]": ("MEM_BR", 1, False),
    "[kk]": ("MEM_VECTOR", 1, False),
    "[hhll]": ("MEM_ABS", 2, False),

    "rr": ("IMM", 1, True),
    "qqrr": ("IMM", 2, True),
    "#nn": ("IMM", 1, False),
    "#mmnn": ("IMM", 2, False),
}

def format(op, arg1, arg2):
    return op, [ARGUMENTS[arg] for arg in [arg1, arg2] if arg]

with open(os.path.join(os.path.dirname(__file__), 's1c88.csv'), 'r') as csvfile:
    spamreader = csv.reader(csvfile)

    next(spamreader)


    arg_types = set([type for (type, size, signed) in ARGUMENTS.values()])
    arg_table = { key: value+1 for value, key in enumerate(arg_types) }

    shift = len(arg_types) + 1
    print ("const Arguments = %s;" % dumps(arg_table, indent=4))
    print ("const lookup = (... rest) => rest.reduce((acc, i) => (acc*%i+i),0);\n" % shift);

    codes = {}
    for row in spamreader:
        code, cycles0, op0, arg0_1, arg0_2, cycles1, op1, arg1_1, arg1_2, cycles2, op2, arg2_1, arg2_2 = row
        code = int(code, 16)

        if not op0 in ['[EXPANSION]', 'undefined']:
        	codes[code,] = format(op0, arg0_1, arg0_2)
        if op1 != 'undefined':
        	codes[0xce, code] = format(op1, arg1_1, arg1_2)
        if op2 != 'undefined':
        	codes[0xcf, code] = format(op2, arg2_1, arg2_2)

    ops = {}
    for (code, (op, args)) in codes.items():
        if not op in ops:
            ops[op] = {}

        index = 0
        size = len(code)
        immediates = []

        for (type, imm_size, imm_signed) in args:
            index = index * shift + arg_table[type]

            if imm_size != 0:
                immediates += [{ 'size': imm_size, 'signed': imm_signed }]

            size += imm_size

        ops[op][index] = { 'code': code, 'size': size, 'immediates': immediates }

    print ("const Instructions = {")
    for op, table in ops.items():
        print ("\t'%s': {" % op)
        for (index, entry) in table.items():
            print ("\t\t[%i]: { code: new Uint8Array([%s]), size: %i, immediates: %s }," % (index, ', '.join(["0x%02x" % c for c in entry['code']]), entry['size'], dumps(entry['immediates'])))
        print ("\t},")
    print ("};\n")

print ("module.exports = { lookup, Arguments, Instructions };\n")
