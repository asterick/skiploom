# TODO: Proper AST values

@{% 
const lexer = require("./lexer.js"); 
const UnaryOperations = {
      "^": "MacroLocalConcat",
      "!": "LogicalNot",
      "~": "BitwiseComplement",
      "-": "Negate",
      "+": "Positive",
      "\\": "IdentifierConcat",
      "\\?": "ValueConcat",
      "\\%?": "HexValueConcat",
}
const BinaryOperations = {
      "||": "LogicalOr",
      "&&": "LogicalAnd",
      "|": "BitwiseOr",
      "^": "BitwiseXor",
      "&": "BitwiseAnd",
      "==": "Equal",
      "!=": "NotEqual",
      ">": "Greater",
      "<": "Less",
      ">=": "GreaterEqual",
      "<=": "LessEqual",
      "<<": "ShiftLeft",
      ">>": "ShiftRight",
      "+": "Add",
      "-": "Subtract",
      "*": "Multiply",
      "/": "Divide",
      "%": "Modulo"
}

function at(index) { return (data) => data[index] }
function location({ line, col }) {
      return { line, col }
}

function unary([op, value]) {
      return { type:"UnaryOperation", value, op: UnaryOperations[op.value], location: location(op) }
}

function binary([left, op, right]) {
      return { type:"BinaryOperation", left, right, op: BinaryOperations[op.value], location: location(left) }
}
%}

@lexer lexer

main -> source_body {% id %}

source_body ->
      source_line:* {% ([directives]) => directives.flat(2).filter((v) => v != null) %}

source_line ->
      label:? directive:? eol 

label ->
      symbol %colon {% ([name]) => ({ type: "Label", name, location:location(name) }) %}

eol ->
      %comment:? %linefeed {% ([comment]) => (comment && { type: "Comment", text:comment.text, location:location(comment) }) %}

directive ->
      symbol expression_list:?
    | "$" symbol expression_list {%()=>null%}# These are discarded
    | "CALLS" expression_list
    | "SYMB" expression_list

    | define_section_directive
    | "SECT" expression ("," "RESET"):?
    | "ALIGN" expression
    | "DEFINE" symbol expression
    | "UNDEF" symbol_list
    | "MSG" expression_list
    | "WARN" expression_list
    | "FAIL" expression_list
    | "INCLUDE" expression ("USING" expression):?
    | "RADIX" number
    | "UNDEF" symbol
    | "END"

    | symbol "EQU" expression
    | symbol "SET" expression
    | "EXTERN" ("(" symbol_list ")"):? symbol_list
    | "LOCAL" symbol_list
    | "GLOBAL" symbol_list
    | "NAME" expression

    | "ASCII" expression_list
    | "ASCIZ" expression_list
    | "DB" expression_list
    | "DW" expression_list
    | "DS" expression

    | "DUP" expression eol
      source_body "ENDM"
    | "DUPA" symbol "," expression_list eol
      source_body "ENDM"
    | "DUPC" symbol "," expression eol
      source_body "ENDM"
    | "DUPF" symbol ("," expression):? "," expression ("," expression):? eol
      source_body "ENDM"
    | symbol "MACRO" symbol_list eol
      source_body "ENDM"
    | if_directive
    | "PMACRO" symbol_list

# Directives
if_directive ->
      "IF" expression eol source_body
      ("ELSEIF" expression eol source_body):*
      ("ELSE" eol source_body):?
      "ENDIF"

define_section_directive ->
      "DEFSECT" expression "," section_type ("," section_attr {% at(1) %}):* ("AT" expression {% at(1) %}):?

section_type ->
      "DATA" {% () => "data" %}
    | "CODE" {% () => "code" %}

section_attr ->
      "SHORT" # TODO: RETURN VALUE HERE
    | "TINY" # TODO: RETURN VALUE HERE
    | "FIT" expression # TODO: RETURN VALUE HERE
    | "OVERLAY" # TODO: RETURN VALUE HERE
    | "ROMDATA" # TODO: RETURN VALUE HERE
    | "NOCLEAR" # TODO: RETURN VALUE HERE
    | "CLEAR" # TODO: RETURN VALUE HERE
    | "INIT" # TODO: RETURN VALUE HERE
    | "MAX" # TODO: RETURN VALUE HERE
    | "JOIN" # TODO: RETURN VALUE HERE

# Lists
expression_list ->
      (expression "," {% id %}):* expression {% ([list, tail]) => list.concat(tail) %}

symbol_list ->
      (symbol "," {% id %}):* symbol {% ([list, tail]) => list.concat(tail) %}

# Expressions
expression ->
      logical_or_expr {% id %}

logical_or_expr ->
      logical_and_expr {% id %}
    | logical_or_expr "||" logical_and_expr {% binary %}

logical_and_expr ->
      bitwise_or_expr {% id %}
    | logical_and_expr "&&" bitwise_or_expr {% binary %}

bitwise_or_expr ->
      bitwise_xor_expr {% id %}
    | bitwise_or_expr "|" bitwise_xor_expr {% binary %}

bitwise_xor_expr ->
      bitwise_and_expr {% id %}
    | bitwise_xor_expr "^" bitwise_and_expr {% binary %}

bitwise_and_expr ->
      equality_expr {% id %}
    | bitwise_and_expr "&" equality_expr {% binary %}

equality_expr ->
      compare_expr {% id %}
    | equality_expr "==" compare_expr {% binary %}
    | equality_expr "!=" compare_expr {% binary %}

compare_expr ->
      shift_expr {% id %}
    | compare_expr ">=" shift_expr {% binary %}
    | compare_expr "<=" shift_expr {% binary %}
    | compare_expr ">" shift_expr {% binary %}
    | compare_expr "<" shift_expr {% binary %}

shift_expr ->
      add_sub_expr {% id %}
    | shift_expr "<<" add_sub_expr {% binary %}
    | shift_expr ">>" add_sub_expr {% binary %}

add_sub_expr ->
      mul_div_expr {% id %}
    | add_sub_expr "+" mul_div_expr {% binary %}
    | add_sub_expr "-" mul_div_expr {% binary %}

mul_div_expr ->
      unary_expr {% id %}
    | mul_div_expr "*" unary_expr {% binary %}
    | mul_div_expr "/" unary_expr {% binary %}
    | mul_div_expr "%" unary_expr {% binary %}

unary_expr ->
      top_level_expr {% id %}
    | "+" unary_expr {% unary %}
    | "-" unary_expr {% unary %}
    | "!" unary_expr {% unary %}
    | "~" unary_expr {% unary %}

top_level_expr ->
      number {% id %}
    | symbol {% id %}
    | string {% id %}
    | "(" expression ")" {% at(1) %}
    | "#" expression {% at(1) %}
    | "*" {% ([id]) => ({ type:"InstructionLocation", location:location(id) }) %}
    | "[" expression "]" {% ([id,e,]) => ({ type:"IndirectMemory", address: e, location:location(id) }) %}
    | %function_name "(" expression_list ")" {% ([name,_,parameters]) => ({ type:"FunctionCall", name:name.value, parameters, location: location(name)}) %}

# Atomic values
symbol ->
      identifier {% id %}
    | symbol "\\" identifier {% binary %}
    | symbol "\\?" identifier {% binary %}
    | symbol "\\%" identifier {% binary %}
    | "^" symbol {% unary %}

identifier ->
      %identifier {% ([id]) => ({ type:"Identifier", name:id.text, location:location(id) }) %}

string ->
      %string {% ([id]) => ({ type:"String", value:id.value, location:location(id) }) %}

number ->
      %number {% ([id]) => ({ type:"Number", value:id.value, location:location(id) }) %}
