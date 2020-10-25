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
function ignore() { return null }
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
      %comment:? %linefeed {% ignore %}

# Directives
directive ->
      symbol expression_list:?
    | "$" symbol expression_list {% ignore %}
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

    | "ASCII" expression_list {% ([id,data]) => ({ type: "AsciiBlock", data, location:location(id) }) %}
    | "ASCIZ" expression_list {% ([id,data]) => ({ type: "TerminatedAsciiBlock", data, location:location(id) }) %}
    | "DB" expression_list {% ([id,data]) => ({ type: "DataBytes", data, location:location(id) }) %}
    | "DW" expression_list {% ([id,data]) => ({ type: "DataWords", data, location:location(id) }) %}
    | "DS" expression {% ([id,size]) => ({ type: "DataAllocate", size, location:location(id) }) %}

    | "PMACRO" symbol_list {% ([id,names]) => ({ type: "PurgeMacros", names, location:location(id) }) %}
    | "DUP" expression eol source_body "ENDM" 
      {% ([id,count,,body]) => ({ type: "CountDup", count, body, location:location(id) }) %}
    | "DUPA" symbol "," expression_list eol source_body "ENDM"
      {% ([id,variable,,list,,body]) => ({ type: "ListDup", variable, list, body, location:location(id) }) %}
    | "DUPC" symbol "," expression eol source_body "ENDM" 
      {% ([id,variable,,string,,body]) => ({ type: "CharacterDup", variable, string, body, location:location(id) }) %}
    | "DUPF" symbol ("," expression  {% at(1) %}):? "," expression ("," expression {% at(1) %}):? eol source_body "ENDM" 
      {% ([id,variable,start,,end,step,,body]) => ({ type: "SequenceDup", variable, start, end, step, body, location:location(id) }) %}
    | symbol "MACRO" symbol_list eol source_body "ENDM"
      {% ([name,,parameters,,body]) => ({ type: "MacroDefinition", name, parameters, body, location:name.location }) %}
    | if_directive

if_directive ->
      "IF" expression eol source_body
      ("ELSEIF" expression eol source_body {% ([,test,,body]) => ({ test, body }) %}):*
      ("ELSE" eol source_body {% at(2) %}):?
      "ENDIF"
      {% ([id,test,,body,elseifs,otherwise]) => ({
            type: "IfClause",
            test, body,
            elseifs, otherwise,
            location:location(id)
      }) %}

define_section_directive ->
      "DEFSECT" expression "," section_type ("," section_attr {% at(1) %}):* ("AT" expression {% at(1) %}):?
      {% ([id,name,,datatype,attributes,at]) => {
          const blob = {
                type: "DefineSection",               
                name, datatype, at,
                location: location(id)
          }
          Object.assign(blob, ...attributes)
          return blob;
      } %}

section_type ->
      "DATA" {% () => "data" %}
    | "CODE" {% () => "code" %}

section_attr ->
      "SHORT" {% () => ({ model: "short" }) %}
    | "TINY" {% () => ({ model: "tiny" }) %}
    | "FIT" expression {% ([,fit]) => ({ fit }) %}
    | "OVERLAY" {% () => ({ target: "overlay" }) %}
    | "ROMDATA" {% () => ({ target: "romdata" }) %}
    | "NOCLEAR" {% () => ({ target: "noclear" }) %}
    | "CLEAR" {% () => ({ target: "clear" }) %}
    | "INIT" {% () => ({ target: "init" }) %}
    | "MAX" {% () => ({ target: "max" }) %}
    | "JOIN" {% () => ({ join: true }) %}

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
