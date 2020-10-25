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
    | %word_calls expression_list
    | %word_symb expression_list

    | define_section_directive
    | %word_sect expression ("," "RESET"):?
    | %word_align expression
    | %word_define symbol expression
    | %word_undef symbol_list
    | %word_msg expression_list
    | %word_warn expression_list
    | %word_fail expression_list
    | %word_include expression (%word_using expression):?
    | %word_radix number
    | %word_undef symbol
    | %word_end

    | symbol %word_equ expression
    | symbol %word_set expression
    | %word_extern ("(" symbol_list ")"):? symbol_list
    | %word_local symbol_list
    | %word_global symbol_list
    | %word_name expression

    | %word_ascii expression_list
    | %word_asciz expression_list
    | %word_db expression_list
    | %word_dw expression_list
    | %word_ds expression

    | %word_dup expression eol
      source_line:* %word_endm
    | %word_dupa symbol "," expression_list eol
      source_line:* %word_endm
    | %word_dupc symbol "," expression eol
      source_line:* %word_endm
    | %word_dupf symbol ("," expression):? "," expression ("," expression):? eol
      source_line:* %word_endm
    | symbol %word_macro symbol_list eol
      source_line:* %word_endm
    | if_directive
    | %word_pmacro symbol_list

comment -> 
      %comment {% id %}

eol ->
      comment:? %linefeed

# Directives
if_directive ->
      %word_if expression eol source_line:*
      (%word_elseif expression eol ):*
      (%word_else expression eol ):?
      %word_endif

define_section_directive ->
      %word_defsect expression "," section_type ("," section_attr):* ("AT" expression):?

section_type ->
      %word_data 
    | %word_code

section_attr ->
      %word_short
    | %word_tiny
    | %word_fit expression
    | %word_overlay
    | %word_romdata
    | %word_noclear
    | %word_clear
    | %word_init
    | %word_max
    | %word_join

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
      %string_start string_part:* %string_end  {% (data) => data[1].join("") %}

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
    # These are just here so these can be case insensitive
    | %word_data | %word_code 
    | %word_short | %word_tiny
    | %word_fit | %word_overlay | %word_romdata | %word_noclear | %word_clear | %word_init | %word_max | %word_join

number ->
      %number
