const moo = require("moo");

const caseInsensitiveKeywords = (map) => {
    const transform = moo.keywords(map)
    return (text) => transform(text.toUpperCase())
}

// These are common between all string types
const escaped = [
    { match: /\\['"\\]/, value: (x) => x.slice(1) },
    { match: /\\[tT]/, value: "\t" },
    { match: /\\[vV]/, value: "\v" },
    { match: /\\[bB]/, value: "\b" },
    { match: /\\[fF]/, value: "\f" },
    { match: /\\[nN]/, value: "\n" },
    { match: /\\[rR]/, value: "\r" },
    { match: /\\[xX][0-9a-fA-F]+/, value: (x) => String.fromCharCode(parseInt(x.slice(2), 16)) },
    { match: /\\[0-9]+/, value: (x) => String.fromCharCode(parseInt(x.slice(1), 10)) },
];

// Reserved words
const keywords = {
    reserved: [
        "CALLS","SYMB","ALIGN","COMMENT","DEFINE","DEFSECT","END","FAIL","INCLUDE",
        "MSG","RADIX","SECT","UNDEF","WARN","EQU","EXTERN","GLOBAL","LOCAL","NAME",
        "SET","ASCII","ASCIZ","DB","DS","DW","DUP","DUPA","DUPC","DUPF","ENDIF",
        "ENDM","EXITM","IF","MACRO","PMACRO"
    ],
    registers: [
        "A", "B", "L", "H", "YP", "XP",
        "BA", "HL", "IX", "IY",
        "NB", "EP", "XP", "YP", "SC", "SP"
    ],
    conditions: [
        "C", "NC", "V", "NV",
        "P", "M", "Z", "NZ",
        "LT", "LE", "GT", "GE", "V", "NV", "NC",
        "F0", "F1", "F2", "F3", 
        "NF0", "NF1", "NF2", "NF3"
    ]
};

// Our lexer
const lexer = moo.states({
    main: {
        continuation: { match: /\\\r\n?|\\\n\r?/, lineBreaks: true },
        linefeed: { match:  /\r\n?|\n\r?/, lineBreaks: true },
        comment: /;(?:[^\n\r\\]|\\(?:\n?\r?|\r?\n?))*(?=\n\r?|\r\n?)/,
        ws: { match: /[ \t]/, discard: true },
        string_start: [
            { match: "'", push: 'single_string' },
            { match: '"', push: 'double_string' },
        ],
        function_name: { match: /@[a-zA-Z]+/, value: (v)=> v.slice(1) },
        identifier: {
            match: /[a-zA-Z_][a-zA-Z_0-9]*/,
            type: caseInsensitiveKeywords(keywords)
        },
        number: /[0-9][0-9a-fA-F]*[bohBOH]?/,

        open_paren: "(",
        close_paren: ")",
        open_bracket: "[",
        close_bracket: "]",
        comma: ",",
        colon: ":",

        operator: [
            "\\?",
            "\\%",
            "<<", ">>",
            "!=", "==", ">=", "<=", ">", "<",
            "&&", "||", "&", "|", "^", "~", "!", 
            "+", "-",
            "/", "*", "%",
            "#",
        ],
    },
    single_string: {
        string_end: { match: "'", pop: 1 },
        characters: /[^\\\n\r']+/,
        escaped
    },
    double_string: {
        string_end: { match: '"', pop: 1 },
        characters: /[^\\\n\r"]+/,
        escaped
    }
});

// This is a helper to discard whitespace preemptively to make our grammer simpler
function filter_whitespace(lexer) {
    const old = lexer.next;

    return (... args) => {
        for (;;) {
            let token = old.apply(lexer, args);
            if (token && token.type == 'ws') continue ;
            return token;
        }
    }
}

lexer.next = filter_whitespace(lexer);
module.exports = lexer;
