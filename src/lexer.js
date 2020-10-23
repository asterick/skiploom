const moo = require("moo");

const caseInsensitiveKeywords = (map) => {
    const transform = moo.keywords(map)
    return (text) => transform(text.toUpperCase())
}

// These are common between all string types
const escaped = [
    { match: /\\['"\\]/, value: (x) => x.slice(1) },
    { match: /\\[tvbfnr]/, value: (x) => JSON.parse(`"${x}"`) },
    { match: /\\[xX][0-9a-fA-F]+/, value: (x) => String.fromCharCode(parseInt(x.slice(2), 16)) },
    { match: /\\[0-9]+/, value: (x) => String.fromCharCode(parseInt(x.slice(1), 10)) },
];

const reserved = [
    "CALLS","SYMB","ALIGN","COMMENT","DEFINE","DEFSECT","END","FAIL","INCLUDE",
    "MSG","RADIX","SECT","UNDEF","WARN","EQU","EXTERN","GLOBAL","LOCAL","NAME",
    "SET","ASCII","ASCIZ","DB","DS","DW","DUP","DUPA","DUPC","DUPF","ENDIF",
    "ENDM","EXITM","IF","MACRO","PMACRO"
];

const registers = [
    "A", "B", "L", "H", "YP", "XP",
    "BA", "HL", "IX", "IY",
    "NB", "EP", "XP", "YP", "SC", "SP"
];

const conditions = [
    "C", "NC", "V", "NV",
    "P", "M", "T", "NT",
    "LT", "LE", "GT", "GE", "V", "NV", "NC",
    "F0", "F1", "F2", "F3", 
    "NF0", "NF1", "NF2", "NF3"
];

const lexer = moo.states({
    main: {
        comment_start: { match: ';', push: 'comment' },
        ws: { match: /[ \t]/, discard: true },
        string: [
            { match: "'", push: 'single_string' },
            { match: '"', push: 'double_string' },
        ],
        identifier: {
            match: /[a-zA-Z_](?:[a-zA-Z_0-9])*/,
            type: caseInsensitiveKeywords ({ 
                reserved: reserved,
                register: registers,
                condition: conditions
            })
        },
        number: /[0-9](?:[0-9a-fA-F])*[bohBOH]?/,

        open_paren: "(",
        close_paren: ")",
        open_bracket: "[",
        close_bracket: "]",
        comma: ",",

        operator: [
            "\\?",
            "\\%",
            "@",
            "<<", ">>",
            "!=", "==", ">=", "<=", ">", "<",
            "&&", "||", "&", "|", "^",
            "~", "!", 
            "+", "-",
            "/", "*", "%",
            "#",
        ],

        continuation: { match: /\\(?:\r\n?)|\\(?:\n\r?)/, lineBreaks: true },
        linefeed: { match: /(?:\r\n?)|(?:\n\r?)/, lineBreaks: true }
    },
    single_string: {
        end_string: { match: "'", pop: 1 },
        characters: /[^\\\n\r']+/,
        escaped
    },
    double_string: {
        end_string: { match: '"', pop: 1 },
        characters: /[^\\\n\r"]+/,
        escaped
    },
    comment: {
        linefeed: { match: /(?:\r\n?)|(?:\n\r?)/, lineBreaks: true, pop: 1 },
        comment_text: { match: /[^\n\r]+/ },
        continuation: { match: /\\(?:\r\n?)|\\(?:\n\r?)/, lineBreaks: true }
    }
});

lexer.reset('"st\\33\\x21 ring" ENDIF xP C @');

while(true) {
    const l = lexer.next();
    if (!l) break;
    console.log(l);
}

module.exports = lexer;
