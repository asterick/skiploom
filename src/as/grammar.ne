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
      "..": "Concatinate",
      "+": "Add",
      "-": "Subtract",
      "*": "Multiply",
      "/": "Divide",
      "%": "Modulo"
}

function at(index) { return (data) => data[index] }
function ignore() { return null }
function location({ line, col }) {
      return { line, col, source: global.parseSource }
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
      symbol expression_list:? {% ([call, parameters]) => ({ type: "DispatchDirective", call, parameters, location:call.location }) %}
    | "$" symbol expression_list {% ignore %}
    | "CALLS" expression_list {% ignore %}
    | "SYMB" expression_list {% ignore %}

    | define_section_directive
    | "SECT" expression ("," "RESET"):? {% ([id,name,reset]) => ({ type: "SectionDirective", name, reset: reset != null, location:location(id)}) %}
    | "ALIGN" expression {% ([id, value]) => ({ type: "AlignDirective", value, location:location(id) }) %}
    | "DEFINE" symbol expression {% ([id, name, value]) => ({ type: "DefineDirective", name, value, location:location(id) }) %}
    | "UNDEF" symbol_list {% ([id, names]) => ({ type: "UndefineDirective", names, location:location(id) }) %}
    | "MSG" expression_list {% ([id, message]) => ({ type: "MessageDirective", message, location:location(id) }) %}
    | "WARN" expression_list {% ([id, message]) => ({ type: "WarningDirective", message, location:location(id) }) %}
    | "FAIL" expression_list {% ([id, message]) => ({ type: "FailureDirective", message, location:location(id) }) %}
    | "INCLUDE" expression ("USING" expression {% at(1) %}):? {% ([id, path, transform]) => ({ type: "IncludeDirective", path, transform, location:location(id) }) %}
    | "RADIX" expression {% ([id, value]) => ({ type: "RadixDirective", value, location:location(id) }) %}
    | "END" {% ([id]) => ({ type: "EndDirective", location:location(id) }) %}

    | "EXTERN" extern_attr_list:? symbol_list
      {% ([id,attributes,names]) => Object.assign({
                type: "ExternDirective",
                location: location(id),
                names
          }, ... attributes)
      %}
    | symbol "EQU" expression {% ([name, value]) => ({ type: "EquateDirective", name, value, location:name.location }) %}
    | symbol "SET" expression {% ([name, value]) => ({ type: "SetDirective", name, value, location:name.location }) %}
    | "LOCAL" symbol_list {% ([id, names]) => ({ type: "LocalDirective", names, location:location(id) }) %}
    | "GLOBAL" symbol_list {% ([id, names]) => ({ type: "GlobalDirective", names, location:location(id) }) %}
    | "NAME" expression {% ([id, name]) => ({ type: "NameDirective", name, location:location(id) }) %}

    | "ASCII" expression_list {% ([id,data]) => ({ type: "AsciiBlockDirective", data, location:location(id) }) %}
    | "ASCIZ" expression_list {% ([id,data]) => ({ type: "TerminatedAsciiBlockDirective", data, location:location(id) }) %}
    | "DB" expression_list {% ([id,data]) => ({ type: "DataBytesDirective", data, location:location(id) }) %}
    | "DW" expression_list {% ([id,data]) => ({ type: "DataWordsDirective", data, location:location(id) }) %}
    | "DS" expression {% ([id,size]) => ({ type: "DataAllocateDirective", size, location:location(id) }) %}

    | "EXITM" {% ([id]) => ({ type: "ExitMacroDirective", location:location(id) }) %}
    | "PMACRO" symbol_list {% ([id,names]) => ({ type: "PurgeMacrosDirective", names, location:location(id) }) %}
    | "DUP" expression eol source_body "ENDM"
      {% ([id,count,,body]) => ({ type: "CountDupDirective", count, body, location:location(id) }) %}
    | "DUPA" symbol "," expression_list eol source_body "ENDM"
      {% ([id,variable,,list,,body]) => ({ type: "ListDupDirective", variable, list, body, location:location(id) }) %}
    | "DUPC" symbol "," expression eol source_body "ENDM"
      {% ([id,variable,,string,,body]) => ({ type: "CharacterDupDirective", variable, string, body, location:location(id) }) %}
    | "DUPF" symbol ("," expression  {% at(1) %}):? "," expression ("," expression {% at(1) %}):? eol source_body "ENDM"
      {% ([id,variable,start,,end,step,,body]) => ({ type: "SequenceDupDirective", variable, start, end, step, body, location:location(id) }) %}
    | symbol "MACRO" symbol_list eol source_body "ENDM"
      {% ([name,,parameters,,body]) => ({ type: "MacroDefinitionDirective", name, parameters, body, location:name.location }) %}
    | if_directive

if_directive ->
      "IF" expression eol source_body
      ("ELSEIF" expression eol source_body {% ([,test,,body]) => ({ test, body }) %}):*
      ("ELSE" eol source_body {% at(2) %}):?
      "ENDIF"
      {% ([id,test,,body,elseifs,otherwise]) => ({
            type: "IfDirective",
            test, body,
            elseifs, otherwise,
            location:location(id)
      }) %}

define_section_directive ->
      "DEFSECT" expression "," section_type ("," section_attr {% at(1) %}):* ("AT" expression {% at(1) %}):?
      {% ([id,name,,datatype,attributes,at]) => Object.assign({
                type: "DefineSectionDirective",
                name, datatype, at,
                location: location(id)
          }, ...attributes)
      %}

section_type ->
      "DATA" {% () => "data" %}
    | "CODE" {% () => "code" %}

extern_attr ->
      "SHORT" {% () => ({ model: "short" }) %}
    | "TINY" {% () => ({ model: "tiny" }) %}
    | "DATA" {% () => ({ location: "data"}) %}
    | "CODE" {% () => ({ location: "code"}) %}

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
extern_attr_list ->
      "(" (extern_attr "," {% id %}):* extern_attr ")" {% ([,list,tail]) => list.concat(tail) %}

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
      concat_expr {% id %}
    | compare_expr ">=" concat_expr {% binary %}
    | compare_expr "<=" concat_expr {% binary %}
    | compare_expr ">" concat_expr {% binary %}
    | compare_expr "<" concat_expr {% binary %}

concat_expr ->
      shift_expr {% id %}
    | shift_expr ".." concat_expr {% binary %}

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
    | %function_name "(" expression_list:? ")" {% ([name,_,parameters]) => ({ type:"FunctionCall", name:name.value, parameters, location: location(name)}) %}

# Atomic values
symbol ->
      identifier {% id %}
    | symbol "\\" identifier {% binary %}
    | symbol "\\?" identifier {% binary %}
    | symbol "\\%" identifier {% binary %}
    | "^" symbol {% unary %}

identifier ->
      %identifier {% ([id]) => ({ type:"Identifier", name:id.value, location:location(id) }) %}

string ->
      %string {% ([id]) => ({ type:"String", value:id.value, location:location(id) }) %}

number ->
      %number {% ([id]) => ({ type:"Number", value:id.value, location:location(id) }) %}
