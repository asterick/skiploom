from json import dumps
import os
import csv

ARGUMENTS = {
    # Conditions
    "LT": "LESS_THAN",
    "LE": "LESS_EQUAL",
    "GT": "GREATER_THAN",
    "GE": "GREATER_EQUAL",
    "V": "OVERFLOW",
    "NV": "NOT_OVERFLOW",
    "P": "POSITIVE",
    "M": "MINUS",
    "C": "CARRY",
    "NC": "NOT_CARRY",
    "Z": "ZERO",
    "NZ": "NOT_ZERO",

    "F0": "SPECIAL_FLAG_0",
    "F1": "SPECIAL_FLAG_1",
    "F2": "SPECIAL_FLAG_2",
    "F3": "SPECIAL_FLAG_3",
    "NF0": "NOT_SPECIAL_FLAG_0",
    "NF1": "NOT_SPECIAL_FLAG_1",
    "NF2": "NOT_SPECIAL_FLAG_2",
    "NF3": "NOT_SPECIAL_FLAG_3",

    # Arguments
    "ALL": "REG_ALL",
    "ALE": "REG_ALE",

    "A": "REG_A",
    "B": "REG_B",
    "L": "REG_L",
    "H": "REG_H",

    "BA": "REG_BA",
    "HL": "REG_HL",
    "IX": "REG_IX",
    "IY": "REG_IY",

    "NB": "REG_NB",
    "BR": "REG_BR",
    "EP": "REG_EP",
    "IP": "REG_IP",
    "XP": "REG_XP",
    "YP": "REG_YP",
    "SC": "REG_SC",

    "SP": "REG_SP",
    "PC": "REG_PC",

    "[hhll]": "MEM_ABS",
    "[HL]": "MEM_HL",
    "[IX]": "MEM_IX",
    "[IY]": "MEM_IY",
    "[SP+dd]": "MEM_SP_DISP",
    "[IX+dd]": "MEM_IX_DISP",
    "[IY+dd]": "MEM_IY_DISP",
    "[IX+L]": "MEM_IX_OFF",
    "[IY+L]": "MEM_IY_OFF",
    "[BR:ll]": "MEM_BR",
    "[kk]": "MEM_VECTOR",

    "rr": ("IMM", 8, True),
    "qqrr": ("IMM", 16, True),
    "#nn": ("IMM", 8, False),
    "#mmnn": ("IMM", 16, False),
}

def format(op, arg1, arg2):
    args = [ARGUMENTS[arg] for arg in [arg1, arg2] if arg]

    size = None
    signed = None
    if len(args) > 0 and type(args[-1]) is tuple:
        (t, size, signed) = args[-1]
        args[-1] = t

    return op, { "args": args, "signed": signed, "size": size }

with open(os.path.join(os.path.dirname(__file__), 's1c88.csv'), 'r') as csvfile:
    spamreader = csv.reader(csvfile)

    next(spamreader)

    arg_types = set()
    cond_types = set()

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
            ops[op] = []


        index = "lookup(%s)" % (', '.join(["Arguments.%s" % arg for arg in args['args']]))
        [arg_types.add(i) for i in args['args']]
        entry = { 'code': code, "size": args['size'], "signed": args['signed'] }
        ops[op] += [(index, entry)]


    shift = len(arg_types) + 1
    print ("const Arguments = {")
    for i, arg in enumerate(arg_types):
        print ("\t%s: %i," % (arg, i+1))
    print ("};\n")

    print ("const lookup = (... rest) => rest.reduce((acc, i) => (acc*%i+i),0);\n" % shift);

    print ("const Instructions = {")
    for op, table in ops.items():
        print ("\t'%s': {" % op)
        for (index, entry) in table:
            print ("\t\t[%s]: { code: new Uint8Array([%s]), signed: %s, size: %s }," % (index, ', '.join([str(c) for c in entry['code']]), entry['signed'] and 'true' or 'false', entry['size'] or 'null'))
            pass
        print ("\t},")
    print ("};\n")

print ("module.exports = { lookup, Arguments, Instructions };\n")
