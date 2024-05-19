// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
(function () {
      function id(x) { return x[0]; }

      const lexer = require("./lexer.js");
      const UnaryOperations = {
            "^": "MacroLocalConcat",
            "!": "LogicalNot",
            "~": "BitwiseComplement",
            "-": "Negate",
            "+": "Positive",
      }
      const BinaryOperations = {
            "\\": "IdentifierConcat",
            "\\?": "ValueConcat",
            "\\%": "HexValueConcat",
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
            return { line, col, ...global.parser_source }
      }

      function unary([op, value]) {
            return { type: "UnaryOperation", value, op: UnaryOperations[op.value], location: location(op) }
      }

      function binary([left, op, right]) {
            return { type: "BinaryOperation", left, right, op: BinaryOperations[op.value], location: location(op) }
      }
      var grammar = {
            Lexer: lexer,
            ParserRules: [
                  { "name": "main", "symbols": ["source_body"], "postprocess": id },
                  { "name": "source_body$ebnf$1", "symbols": [] },
                  { "name": "source_body$ebnf$1", "symbols": ["source_body$ebnf$1", "source_line"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
                  { "name": "source_body", "symbols": ["source_body$ebnf$1"], "postprocess": ([directives]) => directives.flat(2).filter((v) => v != null) },
                  { "name": "source_line$ebnf$1", "symbols": ["label"], "postprocess": id },
                  { "name": "source_line$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
                  { "name": "source_line$ebnf$2", "symbols": ["directive"], "postprocess": id },
                  { "name": "source_line$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
                  { "name": "source_line", "symbols": ["source_line$ebnf$1", "source_line$ebnf$2", "eol"] },
                  { "name": "label", "symbols": ["expression", (lexer.has("colon") ? { type: "colon" } : colon)], "postprocess": ([name]) => ({ type: "LabelDirective", name, location: name.location }) },
                  { "name": "eol$ebnf$1", "symbols": [(lexer.has("comment") ? { type: "comment" } : comment)], "postprocess": id },
                  { "name": "eol$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
                  { "name": "eol", "symbols": ["eol$ebnf$1", (lexer.has("linefeed") ? { type: "linefeed" } : linefeed)], "postprocess": ignore },
                  { "name": "directive$ebnf$1", "symbols": ["expression_list"], "postprocess": id },
                  { "name": "directive$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
                  { "name": "directive", "symbols": ["symbol", "directive$ebnf$1"], "postprocess": ([call, parameters]) => ({ type: "DispatchDirective", call, parameters, location: call.location }) },
                  { "name": "directive", "symbols": [{ "literal": "$" }, "symbol", "expression_list"], "postprocess": ignore },
                  { "name": "directive", "symbols": [{ "literal": "CALLS" }, "expression_list"], "postprocess": ignore },
                  { "name": "directive", "symbols": [{ "literal": "SYMB" }, "expression_list"], "postprocess": ignore },
                  { "name": "directive", "symbols": ["define_section_directive"] },
                  { "name": "directive$ebnf$2$subexpression$1", "symbols": [{ "literal": "," }, { "literal": "REQUIRED" }] },
                  { "name": "directive$ebnf$2", "symbols": ["directive$ebnf$2$subexpression$1"], "postprocess": id },
                  { "name": "directive$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
                  { "name": "directive$ebnf$3$subexpression$1", "symbols": [{ "literal": "," }, { "literal": "RESET" }] },
                  { "name": "directive$ebnf$3", "symbols": ["directive$ebnf$3$subexpression$1"], "postprocess": id },
                  { "name": "directive$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
                  { "name": "directive", "symbols": [{ "literal": "SECT" }, "expression", "directive$ebnf$2", "directive$ebnf$3"], "postprocess": ([id, name, required, reset]) => ({ type: "SectionDirective", name, reset: reset != null, required: required != null, location: location(id) }) },
                  { "name": "directive", "symbols": [{ "literal": "ALIGN" }, "expression"], "postprocess": ([id, value]) => ({ type: "AlignDirective", value, location: location(id) }) },
                  { "name": "directive", "symbols": [{ "literal": "DEFINE" }, "symbol", "expression"], "postprocess": ([id, name, value]) => ({ type: "DefineDirective", name, value, location: location(id) }) },
                  { "name": "directive", "symbols": [{ "literal": "UNDEF" }, "symbol_list"], "postprocess": ([id, names]) => ({ type: "UndefineDirective", names, location: location(id) }) },
                  { "name": "directive", "symbols": [{ "literal": "MSG" }, "expression_list"], "postprocess": ([id, message]) => ({ type: "MessageDirective", message, location: location(id) }) },
                  { "name": "directive", "symbols": [{ "literal": "WARN" }, "expression_list"], "postprocess": ([id, message]) => ({ type: "WarningDirective", message, location: location(id) }) },
                  { "name": "directive", "symbols": [{ "literal": "FAIL" }, "expression_list"], "postprocess": ([id, message]) => ({ type: "FailureDirective", message, location: location(id) }) },
                  { "name": "directive$ebnf$4$subexpression$1", "symbols": [{ "literal": "USING" }, "expression"], "postprocess": at(1) },
                  { "name": "directive$ebnf$4", "symbols": ["directive$ebnf$4$subexpression$1"], "postprocess": id },
                  { "name": "directive$ebnf$4", "symbols": [], "postprocess": function (d) { return null; } },
                  { "name": "directive", "symbols": [{ "literal": "INCLUDE" }, "expression", "directive$ebnf$4"], "postprocess": ([id, path, transform]) => ({ type: "IncludeDirective", path, transform, location: location(id) }) },
                  { "name": "directive", "symbols": [{ "literal": "RADIX" }, "expression"], "postprocess": ([id, value]) => ({ type: "RadixDirective", value, location: location(id) }) },
                  { "name": "directive", "symbols": [{ "literal": "END" }], "postprocess": ([id]) => ({ type: "EndDirective", location: location(id) }) },
                  { "name": "directive$ebnf$5", "symbols": ["extern_attr_list"], "postprocess": id },
                  { "name": "directive$ebnf$5", "symbols": [], "postprocess": function (d) { return null; } },
                  {
                        "name": "directive", "symbols": [{ "literal": "EXTERN" }, "directive$ebnf$5", "symbol_list"], "postprocess": ([id, attributes, names]) => ({
                              type: "ExternDirective",
                              location: location(id),
                              names,
                              attributes: attributes ? Object.assign({}, ...attributes) : attributes
                        })
                  },
                  { "name": "directive", "symbols": ["symbol", { "literal": "EQU" }, "expression"], "postprocess": ([name, _, value]) => ({ type: "EquateDirective", name, value, location: name.location }) },
                  { "name": "directive", "symbols": ["symbol", { "literal": "SET" }, "expression"], "postprocess": ([name, _, value]) => ({ type: "SetDirective", name, value, location: name.location }) },
                  { "name": "directive", "symbols": [{ "literal": "LOCAL" }, "symbol_list"], "postprocess": ([id, names]) => ({ type: "LocalDirective", names, location: location(id) }) },
                  { "name": "directive$ebnf$6", "symbols": ["weak_attr"], "postprocess": id },
                  { "name": "directive$ebnf$6", "symbols": [], "postprocess": function (d) { return null; } },
                  { "name": "directive", "symbols": [{ "literal": "GLOBAL" }, "directive$ebnf$6", "symbol_list"], "postprocess": ([id, weak, names]) => ({ type: "GlobalDirective", weak: Boolean(weak), names, location: location(id) }) },
                  { "name": "directive", "symbols": [{ "literal": "NAME" }, "expression"], "postprocess": ([id, name]) => ({ type: "NameDirective", name, location: location(id) }) },
                  { "name": "directive", "symbols": [{ "literal": "ASCII" }, "expression_list"], "postprocess": ([id, data]) => ({ type: "AsciiBlockDirective", data, location: location(id) }) },
                  { "name": "directive", "symbols": [{ "literal": "ASCIZ" }, "expression_list"], "postprocess": ([id, data]) => ({ type: "TerminatedAsciiBlockDirective", data, location: location(id) }) },
                  { "name": "directive", "symbols": [{ "literal": "DB" }, "expression_list"], "postprocess": ([id, data]) => ({ type: "DataBytesDirective", data, location: location(id) }) },
                  { "name": "directive", "symbols": [{ "literal": "DW" }, "expression_list"], "postprocess": ([id, data]) => ({ type: "DataWordsDirective", data, location: location(id) }) },
                  { "name": "directive", "symbols": [{ "literal": "DS" }, "expression"], "postprocess": ([id, size]) => ({ type: "DataAllocateDirective", size, location: location(id) }) },
                  { "name": "directive", "symbols": [{ "literal": "EXITM" }], "postprocess": ([id]) => ({ type: "ExitMacroDirective", location: location(id) }) },
                  { "name": "directive", "symbols": [{ "literal": "PMACRO" }, "symbol_list"], "postprocess": ([id, names]) => ({ type: "PurgeMacrosDirective", names, location: location(id) }) },
                  { "name": "directive$ebnf$7", "symbols": ["symbol"], "postprocess": id },
                  { "name": "directive$ebnf$7", "symbols": [], "postprocess": function (d) { return null; } },
                  { "name": "directive", "symbols": ["directive$ebnf$7", { "literal": "DUP" }, "expression", "eol", "source_body", { "literal": "ENDM" }], "postprocess": ([counter, id, count, , body]) => ({ type: "CountDupDirective", counter, count, body, location: location(id) }) },
                  { "name": "directive$ebnf$8", "symbols": ["symbol"], "postprocess": id },
                  { "name": "directive$ebnf$8", "symbols": [], "postprocess": function (d) { return null; } },
                  { "name": "directive", "symbols": ["directive$ebnf$8", { "literal": "DUPA" }, "symbol", { "literal": "," }, "expression_list", "eol", "source_body", { "literal": "ENDM" }], "postprocess": ([counter, id, variable, , list, , body]) => ({ type: "ListDupDirective", counter, variable, list, body, location: location(id) }) },
                  { "name": "directive$ebnf$9", "symbols": ["symbol"], "postprocess": id },
                  { "name": "directive$ebnf$9", "symbols": [], "postprocess": function (d) { return null; } },
                  { "name": "directive", "symbols": ["directive$ebnf$9", { "literal": "DUPC" }, "symbol", { "literal": "," }, "expression_list", "eol", "source_body", { "literal": "ENDM" }], "postprocess": ([counter, id, variable, , strings, , body]) => ({ type: "CharacterDupDirective", counter, variable, strings, body, location: location(id) }) },
                  { "name": "directive$ebnf$10", "symbols": ["symbol"], "postprocess": id },
                  { "name": "directive$ebnf$10", "symbols": [], "postprocess": function (d) { return null; } },
                  { "name": "directive$ebnf$11$subexpression$1", "symbols": [{ "literal": "," }, "expression"], "postprocess": at(1) },
                  { "name": "directive$ebnf$11", "symbols": ["directive$ebnf$11$subexpression$1"], "postprocess": id },
                  { "name": "directive$ebnf$11", "symbols": [], "postprocess": function (d) { return null; } },
                  { "name": "directive$ebnf$12$subexpression$1", "symbols": [{ "literal": "," }, "expression"], "postprocess": at(1) },
                  { "name": "directive$ebnf$12", "symbols": ["directive$ebnf$12$subexpression$1"], "postprocess": id },
                  { "name": "directive$ebnf$12", "symbols": [], "postprocess": function (d) { return null; } },
                  { "name": "directive", "symbols": ["directive$ebnf$10", { "literal": "DUPF" }, "symbol", "directive$ebnf$11", { "literal": "," }, "expression", "directive$ebnf$12", "eol", "source_body", { "literal": "ENDM" }], "postprocess": ([counter, id, variable, start, , end, step, , body]) => ({ type: "SequenceDupDirective", counter, variable, start, end, step, body, location: location(id) }) },
                  { "name": "directive", "symbols": ["symbol", { "literal": "MACRO" }, "symbol_list", "eol", "source_body", { "literal": "ENDM" }], "postprocess": ([name, , parameters, , body]) => ({ type: "MacroDefinitionDirective", name, parameters, body, location: name.location }) },
                  { "name": "directive", "symbols": ["if_directive"] },
                  { "name": "weak_attr", "symbols": [{ "literal": "WEAK" }], "postprocess": () => true },
                  { "name": "if_directive$ebnf$1", "symbols": [] },
                  { "name": "if_directive$ebnf$1$subexpression$1", "symbols": [{ "literal": "ELSEIF" }, "expression", "eol", "source_body"], "postprocess": ([, test, , body]) => ({ test, body }) },
                  { "name": "if_directive$ebnf$1", "symbols": ["if_directive$ebnf$1", "if_directive$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
                  { "name": "if_directive$ebnf$2$subexpression$1", "symbols": [{ "literal": "ELSE" }, "eol", "source_body"], "postprocess": at(2) },
                  { "name": "if_directive$ebnf$2", "symbols": ["if_directive$ebnf$2$subexpression$1"], "postprocess": id },
                  { "name": "if_directive$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
                  {
                        "name": "if_directive", "symbols": [{ "literal": "IF" }, "expression", "eol", "source_body", "if_directive$ebnf$1", "if_directive$ebnf$2", { "literal": "ENDIF" }], "postprocess": ([id, test, , body, elseifs, otherwise]) => ({
                              type: "IfDirective",
                              conditions: [{ test, body }, ...elseifs], otherwise,
                              location: location(id)
                        })
                  },
                  { "name": "define_section_directive$ebnf$1", "symbols": [] },
                  { "name": "define_section_directive$ebnf$1$subexpression$1", "symbols": [{ "literal": "," }, "section_attr"], "postprocess": at(1) },
                  { "name": "define_section_directive$ebnf$1", "symbols": ["define_section_directive$ebnf$1", "define_section_directive$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
                  { "name": "define_section_directive$ebnf$2$subexpression$1", "symbols": [{ "literal": "AT" }, "expression"], "postprocess": at(1) },
                  { "name": "define_section_directive$ebnf$2", "symbols": ["define_section_directive$ebnf$2$subexpression$1"], "postprocess": id },
                  { "name": "define_section_directive$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
                  {
                        "name": "define_section_directive", "symbols": [{ "literal": "DEFSECT" }, "expression", { "literal": "," }, "section_type", "define_section_directive$ebnf$1", "define_section_directive$ebnf$2"], "postprocess": ([id, name, , datatype, attributes, at]) => Object.assign({
                              type: "DefineSectionDirective",
                              name, datatype, at,
                              location: location(id)
                        }, ...attributes)
                  },
                  { "name": "section_type", "symbols": [{ "literal": "DATA" }], "postprocess": () => "data" },
                  { "name": "section_type", "symbols": [{ "literal": "CODE" }], "postprocess": () => "code" },
                  { "name": "extern_attr", "symbols": [{ "literal": "SHORT" }], "postprocess": () => ({ model: "short" }) },
                  { "name": "extern_attr", "symbols": [{ "literal": "TINY" }], "postprocess": () => ({ model: "tiny" }) },
                  { "name": "extern_attr", "symbols": [{ "literal": "DATA" }], "postprocess": () => ({ contents: "data" }) },
                  { "name": "extern_attr", "symbols": [{ "literal": "CODE" }], "postprocess": () => ({ contents: "code" }) },
                  { "name": "section_attr", "symbols": [{ "literal": "SHORT" }], "postprocess": () => ({ model: "short" }) },
                  { "name": "section_attr", "symbols": [{ "literal": "TINY" }], "postprocess": () => ({ model: "tiny" }) },
                  { "name": "section_attr", "symbols": [{ "literal": "FIT" }, "expression"], "postprocess": ([, fit]) => ({ fit }) },
                  { "name": "section_attr", "symbols": [{ "literal": "OVERLAY" }], "postprocess": () => ({ target: "overlay" }) },
                  { "name": "section_attr", "symbols": [{ "literal": "ROMDATA" }], "postprocess": () => ({ target: "romdata" }) },
                  { "name": "section_attr", "symbols": [{ "literal": "MAX" }], "postprocess": () => ({ target: "max" }) },
                  { "name": "section_attr", "symbols": [{ "literal": "JOIN" }], "postprocess": () => ({ join: true }) },
                  { "name": "section_attr", "symbols": [{ "literal": "NOCLEAR" }], "postprocess": () => ({ initialize: "noclear" }) },
                  { "name": "section_attr", "symbols": [{ "literal": "CLEAR" }], "postprocess": () => ({ initialize: "clear" }) },
                  { "name": "section_attr", "symbols": [{ "literal": "INIT" }], "postprocess": () => ({ initialize: "copy" }) },
                  { "name": "extern_attr_list$ebnf$1", "symbols": [] },
                  { "name": "extern_attr_list$ebnf$1$subexpression$1", "symbols": ["extern_attr", { "literal": "," }], "postprocess": id },
                  { "name": "extern_attr_list$ebnf$1", "symbols": ["extern_attr_list$ebnf$1", "extern_attr_list$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
                  { "name": "extern_attr_list", "symbols": [{ "literal": "(" }, "extern_attr_list$ebnf$1", "extern_attr", { "literal": ")" }], "postprocess": ([, list, tail]) => list.concat(tail) },
                  { "name": "expression_list$ebnf$1", "symbols": [] },
                  { "name": "expression_list$ebnf$1$subexpression$1", "symbols": ["expression", { "literal": "," }], "postprocess": id },
                  { "name": "expression_list$ebnf$1", "symbols": ["expression_list$ebnf$1", "expression_list$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
                  { "name": "expression_list", "symbols": ["expression_list$ebnf$1", "expression"], "postprocess": ([list, tail]) => list.concat(tail) },
                  { "name": "symbol_list$ebnf$1", "symbols": [] },
                  { "name": "symbol_list$ebnf$1$subexpression$1", "symbols": ["symbol", { "literal": "," }], "postprocess": id },
                  { "name": "symbol_list$ebnf$1", "symbols": ["symbol_list$ebnf$1", "symbol_list$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
                  { "name": "symbol_list", "symbols": ["symbol_list$ebnf$1", "symbol"], "postprocess": ([list, tail]) => list.concat(tail) },
                  { "name": "expression", "symbols": ["register"], "postprocess": id },
                  { "name": "expression", "symbols": ["condition"], "postprocess": id },
                  { "name": "expression", "symbols": ["logical_or_expr"], "postprocess": id },
                  { "name": "expression", "symbols": [{ "literal": "#" }, "logical_or_expr"], "postprocess": ([_, value]) => (value) },
                  { "name": "expression", "symbols": [{ "literal": "[" }, "logical_or_expr", { "literal": "]" }], "postprocess": ([id, address,]) => ({ type: "IndirectAbsolute", address, location: location(id) }) },
                  { "name": "expression", "symbols": [{ "literal": "[" }, "register", { "literal": "]" }], "postprocess": ([id, register,]) => ({ type: "IndirectRegister", register, location: location(id) }) },
                  { "name": "expression", "symbols": [{ "literal": "[" }, "register", { "literal": "+" }, "register", { "literal": "]" }], "postprocess": ([id, register, _, index,]) => ({ type: "IndirectRegisterIndex", register, index, location: location(id) }) },
                  { "name": "expression", "symbols": [{ "literal": "[" }, "register", { "literal": "+" }, "logical_or_expr", { "literal": "]" }], "postprocess": ([id, register, _, displace,]) => ({ type: "IndirectRegisterDisplace", register, displace, location: location(id) }) },
                  { "name": "expression", "symbols": [{ "literal": "[" }, "register", { "literal": "-" }, "logical_or_expr", { "literal": "]" }], "postprocess": ([id, register, _, displace,]) => ({ type: "IndirectRegisterDisplace", register, displace: { type: "UnaryOperation", value: displace, op: "Negate", location: location(displace) }, location: location(id) }) },
                  { "name": "expression", "symbols": [{ "literal": "[" }, "register", { "literal": ":" }, "logical_or_expr", { "literal": "]" }], "postprocess": ([id, register, _, offset,]) => ({ type: "IndirectRegisterOffset", register, offset, location: location(id) }) },
                  { "name": "logical_or_expr", "symbols": ["logical_and_expr"], "postprocess": id },
                  { "name": "logical_or_expr", "symbols": ["logical_or_expr", { "literal": "||" }, "logical_and_expr"], "postprocess": binary },
                  { "name": "logical_and_expr", "symbols": ["bitwise_or_expr"], "postprocess": id },
                  { "name": "logical_and_expr", "symbols": ["logical_and_expr", { "literal": "&&" }, "bitwise_or_expr"], "postprocess": binary },
                  { "name": "bitwise_or_expr", "symbols": ["bitwise_xor_expr"], "postprocess": id },
                  { "name": "bitwise_or_expr", "symbols": ["bitwise_or_expr", { "literal": "|" }, "bitwise_xor_expr"], "postprocess": binary },
                  { "name": "bitwise_xor_expr", "symbols": ["bitwise_and_expr"], "postprocess": id },
                  { "name": "bitwise_xor_expr", "symbols": ["bitwise_xor_expr", { "literal": "^" }, "bitwise_and_expr"], "postprocess": binary },
                  { "name": "bitwise_and_expr", "symbols": ["equality_expr"], "postprocess": id },
                  { "name": "bitwise_and_expr", "symbols": ["bitwise_and_expr", { "literal": "&" }, "equality_expr"], "postprocess": binary },
                  { "name": "equality_expr", "symbols": ["compare_expr"], "postprocess": id },
                  { "name": "equality_expr", "symbols": ["equality_expr", { "literal": "==" }, "compare_expr"], "postprocess": binary },
                  { "name": "equality_expr", "symbols": ["equality_expr", { "literal": "!=" }, "compare_expr"], "postprocess": binary },
                  { "name": "compare_expr", "symbols": ["concat_expr"], "postprocess": id },
                  { "name": "compare_expr", "symbols": ["compare_expr", { "literal": ">=" }, "concat_expr"], "postprocess": binary },
                  { "name": "compare_expr", "symbols": ["compare_expr", { "literal": "<=" }, "concat_expr"], "postprocess": binary },
                  { "name": "compare_expr", "symbols": ["compare_expr", { "literal": ">" }, "concat_expr"], "postprocess": binary },
                  { "name": "compare_expr", "symbols": ["compare_expr", { "literal": "<" }, "concat_expr"], "postprocess": binary },
                  { "name": "concat_expr", "symbols": ["shift_expr"], "postprocess": id },
                  { "name": "concat_expr", "symbols": ["shift_expr", { "literal": ".." }, "concat_expr"], "postprocess": binary },
                  { "name": "shift_expr", "symbols": ["add_sub_expr"], "postprocess": id },
                  { "name": "shift_expr", "symbols": ["shift_expr", { "literal": "<<" }, "add_sub_expr"], "postprocess": binary },
                  { "name": "shift_expr", "symbols": ["shift_expr", { "literal": ">>" }, "add_sub_expr"], "postprocess": binary },
                  { "name": "add_sub_expr", "symbols": ["mul_div_expr"], "postprocess": id },
                  { "name": "add_sub_expr", "symbols": ["mul_div_expr", { "literal": "+" }, "add_sub_expr"], "postprocess": binary },
                  { "name": "add_sub_expr", "symbols": ["mul_div_expr", { "literal": "-" }, "add_sub_expr"], "postprocess": binary },
                  { "name": "mul_div_expr", "symbols": ["unary_expr"], "postprocess": id },
                  { "name": "mul_div_expr", "symbols": ["mul_div_expr", { "literal": "*" }, "unary_expr"], "postprocess": binary },
                  { "name": "mul_div_expr", "symbols": ["mul_div_expr", { "literal": "/" }, "unary_expr"], "postprocess": binary },
                  { "name": "mul_div_expr", "symbols": ["mul_div_expr", { "literal": "%" }, "unary_expr"], "postprocess": binary },
                  { "name": "unary_expr", "symbols": ["top_level_expr"], "postprocess": id },
                  { "name": "unary_expr", "symbols": [{ "literal": "+" }, "unary_expr"], "postprocess": unary },
                  { "name": "unary_expr", "symbols": [{ "literal": "-" }, "unary_expr"], "postprocess": unary },
                  { "name": "unary_expr", "symbols": [{ "literal": "!" }, "unary_expr"], "postprocess": unary },
                  { "name": "unary_expr", "symbols": [{ "literal": "~" }, "unary_expr"], "postprocess": unary },
                  { "name": "top_level_expr", "symbols": ["number"], "postprocess": id },
                  { "name": "top_level_expr", "symbols": ["symbol"], "postprocess": id },
                  { "name": "top_level_expr", "symbols": ["string"], "postprocess": id },
                  { "name": "top_level_expr", "symbols": [{ "literal": "(" }, "logical_or_expr", { "literal": ")" }], "postprocess": at(1) },
                  { "name": "top_level_expr", "symbols": [{ "literal": "*" }], "postprocess": ([id]) => ({ type: "InstructionLocation", location: location(id) }) },
                  { "name": "top_level_expr$ebnf$1", "symbols": ["expression_list"], "postprocess": id },
                  { "name": "top_level_expr$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
                  { "name": "top_level_expr", "symbols": [(lexer.has("function_name") ? { type: "function_name" } : function_name), { "literal": "(" }, "top_level_expr$ebnf$1", { "literal": ")" }], "postprocess": ([name, _, parameters]) => ({ type: "FunctionCall", name: name.value, parameters, location: location(name) }) },
                  { "name": "symbol", "symbols": ["identifier"], "postprocess": id },
                  { "name": "symbol", "symbols": ["symbol", { "literal": "\\" }, "identifier"], "postprocess": binary },
                  { "name": "symbol", "symbols": ["symbol", { "literal": "\\?" }, "identifier"], "postprocess": binary },
                  { "name": "symbol", "symbols": ["symbol", { "literal": "\\%" }, "identifier"], "postprocess": binary },
                  { "name": "symbol", "symbols": [{ "literal": "^" }, "symbol"], "postprocess": unary },
                  { "name": "register", "symbols": [(lexer.has("register") ? { type: "register" } : register)], "postprocess": ([id]) => ({ type: "Register", name: id.value.toUpperCase(), location: location(id) }) },
                  { "name": "condition", "symbols": [(lexer.has("condition") ? { type: "condition" } : condition)], "postprocess": ([id]) => ({ type: "Condition", name: id.value.toUpperCase(), location: location(id) }) },
                  { "name": "identifier", "symbols": [(lexer.has("identifier") ? { type: "identifier" } : identifier)], "postprocess": ([id]) => ({ type: "Identifier", name: id.value, location: location(id) }) },
                  { "name": "string", "symbols": [(lexer.has("string") ? { type: "string" } : string)], "postprocess": ([id]) => ({ type: "String", value: id.value, location: location(id) }) },
                  { "name": "number", "symbols": [(lexer.has("number") ? { type: "number" } : number)], "postprocess": ([id]) => ({ type: "Number", value: id.value, location: location(id) }) }
            ]
            , ParserStart: "main"
      }
      if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
            module.exports = grammar;
      } else {
            window.grammar = grammar;
      }
})();
