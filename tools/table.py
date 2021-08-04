from json import dumps
import os
import csv

CONDITIONS = {
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

    "F0": "CONDITION_SPECIAL_FLAG_0",
    "F1": "CONDITION_SPECIAL_FLAG_1",
    "F2": "CONDITION_SPECIAL_FLAG_2",
    "F3": "CONDITION_SPECIAL_FLAG_3",
    "NF0": "CONDITION_NOT_SPECIAL_FLAG_0",
    "NF1": "CONDITION_NOT_SPECIAL_FLAG_1",
    "NF2": "CONDITION_NOT_SPECIAL_FLAG_2",
    "NF3": "CONDITION_NOT_SPECIAL_FLAG_3"
}

ARGUMENTS = {
    "ALL": "REGS_ALL",
    "ALE": "REGS_ALE",

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

    "[hhll]": "MEM_ABS16",
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

    "rr": "REL_8",
    "qqrr": "REL_16",
    "#nn": "IMM_8",
    "#mmnn": "IMM_16",
}

def format(op, arg1, arg2):
    condition = None

    if arg1 in CONDITIONS:
        condition, arg1, arg2 = CONDITIONS[arg1], arg2, None

    args = ["Arguments.%s" % ARGUMENTS[arg] for arg in [arg1, arg2] if arg]

    # add conditions
    return op, { "condition": condition, "args": args }

with open(os.path.join(os.path.dirname(__file__), 's1c88.csv'), 'r') as csvfile:
    spamreader = csv.reader(csvfile)

    next(spamreader)

    shift = len(ARGUMENTS.values()) + 1

    print ("const Arguments = {")
    for i, arg in enumerate(ARGUMENTS.values()):
        print ("\t%s: %i," % (arg, i+1))
    print ("};\n")

    print ("const Conditions = {")
    for i, arg in enumerate(CONDITIONS.values()):
        print ("\t%s: %i," % (arg, (i+1) * (shift ** 2)))
    print ("};\n")

    print "const lookup = (... rest) => rest.reduce((acc, i) => (acc*%i+i),0);\n" % shift;

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

        index = "lookup(%s)" % (', '.join(args['args']))
        if args['condition']:
            index = index + "+Conditions." + args['condition']

        ops[op] += [(index, "[%s]" % ", ".join([str(byte) for byte in code]))]

    print ("const Instructions = {")
    for op, table in ops.items():
        print ("\t'%s': {" % op)
        for (index, code) in table:
            print "\t\t[%s]: %s," % (index, code)
        print ("\t},")
    print ("};\n")

print "module.exports = { Arguments, Conditions, Instructions };\n"
