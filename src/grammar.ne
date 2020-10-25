# TDOO: Proper AST values

@{% 
const lexer = require("./lexer.js"); 

function value(data) { return data[0].value }
function at(index) { return (data) => data[index] }
%}

@lexer lexer

main -> source_line:*

source_line ->
    label:? directive:? eol

label ->
      symbol %colon {% ([name]) => ({ type: "Label", name }) %}

directive ->
      symbol expression_list:?
    | "$" symbol expression_list # These are discarded
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
      source_line:* "ENDM"
    | "DUPA" symbol "," expression_list eol
      source_line:* "ENDM"
    | "DUPC" symbol "," expression eol
      source_line:* "ENDM"
    | "DUPF" symbol ("," expression):? "," expression ("," expression):? eol
      source_line:* "ENDM"
    | symbol "MACRO" symbol_list eol
      source_line:* "ENDM"
    | if_directive
    | "PMACRO" symbol_list

comment -> 
      %comment {% id %}

eol ->
      comment:? %linefeed

# Directives
if_directive ->
      "IF" expression eol source_line:*
      ("ELSEIF" expression eol ):*
      ("ELSE" expression eol ):?
      "ENDIF"

define_section_directive ->
      "DEFSECT" expression "," section_type ("," section_attr):* ("AT" expression):?

section_type ->
      "DATA" 
    | "CODE"

section_attr ->
      "SHORT"
    | "TINY"
    | "FIT" expression
    | "OVERLAY"
    | "ROMDATA"
    | "NOCLEAR"
    | "CLEAR"
    | "INIT"
    | "MAX"
    | "JOIN"

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
    | logical_or_expr "||" logical_and_expr

logical_and_expr ->
      bitwise_or_expr {% id %}
    | logical_and_expr "&&" bitwise_or_expr

bitwise_or_expr ->
      bitwise_xor_expr {% id %}
    | bitwise_or_expr "|" bitwise_xor_expr

bitwise_xor_expr ->
      bitwise_and_expr {% id %}
    | bitwise_xor_expr "^" bitwise_and_expr

bitwise_and_expr ->
      equality_expr {% id %}
    | bitwise_and_expr "&" equality_expr

equality_expr ->
      compare_expr {% id %}
    | equality_expr "==" compare_expr
    | equality_expr "!=" compare_expr

compare_expr ->
      shift_expr {% id %}
    | compare_expr ">=" shift_expr
    | compare_expr "<=" shift_expr
    | compare_expr ">" shift_expr
    | compare_expr "<" shift_expr

shift_expr ->
      add_sub_expr {% id %}
    | shift_expr "<<" add_sub_expr
    | shift_expr ">>" add_sub_expr

add_sub_expr ->
      mul_div_expr {% id %}
    | add_sub_expr "+" mul_div_expr
    | add_sub_expr "-" mul_div_expr

mul_div_expr ->
      unary_expr {% id %}
    | mul_div_expr "*" unary_expr
    | mul_div_expr "/" unary_expr
    | mul_div_expr "%" unary_expr

unary_expr ->
      top_level_expr {% id %}
    | "+" unary_expr
    | "-" unary_expr
    | "!" unary_expr
    | "~" unary_expr

top_level_expr ->
      "(" expression ")" {% at(1) %}
    | "[" expression "]"
    | "#" expression {% at(1) %}
    | "*"
    | %function_name "(" expression_list ")"
    | number {% id %}
    | symbol {% id %}
    | string {% id %}

# Atomic values
string ->
      %string {% value %}

string_part ->
      %characters {% value %}
    | %escaped {% value %}

symbol ->
      symbol "\\" %identifier
    | symbol "\\?" %identifier
    | symbol "\\%" %identifier
    | "^" symbol
    | identifier

identifier ->
      %identifier

number ->
      %number
