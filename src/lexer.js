const moo = require("moo");

const caseInsensitiveKeywords = (map) => {
    const transform = moo.keywords(map)
    return (text) => transform(text.toUpperCase())
}

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

function escape(text) {
    text = text.replace(/\\['"tTvVbBfFnNrR]/g, (v) => JSON.parse(`"${v}"`));
    text = text.replace(/\\([0-9]+)/g, (_,v) => String.fromCharCode(parseInt(v, 10)));
    text = text.replace(/\\x([0-9a-f]+)/ig, (_,v) => String.fromCharCode(parseInt(v, 16)));
    return text;
}

console.log(escape("Hello[\\x21][\\33]"));

// Reserved words
const keywords = {
    reserved: [
        // Reserved words
        "CALLS","SYMB","ALIGN","COMMENT","DEFINE","DEFSECT","END","FAIL","INCLUDE",
        "MSG","RADIX","SECT","UNDEF","WARN","EQU","EXTERN","GLOBAL","LOCAL","NAME",
        "SET","ASCII","ASCIZ","DB","DS","DW","DUP","DUPA","DUPC","DUPF","ENDIF",
        "ENDM","EXITM","IF","MACRO","PMACRO","USING","ELSEIF",
    ]
};

// Our lexer
const lexer = moo.compile({
    continuation: { match: /\\\r\n?|\\\n\r?/, lineBreaks: true },
    linefeed: { match:  /\r\n?|\n\r?/, lineBreaks: true },
    comment: /;(?:[^\n\r\\]|\\(?:\n?\r?|\r?\n?))*(?=\n\r?|\r\n?)/,
    ws: { match: /[ \t]/, discard: true },
    string: [
        { match: /"(?:\\['"tTvVbBfFnNrR]|\\[xX][0-9a-fA-F]+|\\[0-9]+|[^\\\n\r"])+"/, value: (s) => escape(s.slice(1,-1)) },
        { match: /'(?:\\['"tTvVbBfFnNrR]|\\[xX][0-9a-fA-F]+|\\[0-9]+|[^\\\n\r'])+'/, value: (s) => escape(s.slice(1,-1)) },
    ],
    function_name: { match: /@[a-zA-Z]+/, value: (v) => v.slice(1) },
    identifier: {
        match: /[a-zA-Z_][a-zA-Z_0-9]*/,
        type: caseInsensitiveKeywords(keywords),
        value: (word) => word.toUpperCase()
    },
    number: [
        { match: /[0-9][0-9a-fA-F]*[hH]/, value: (v) => parseInt(v, 16) },
        { match: /[0-9]+[dD]?/, value: (v) => parseInt(v, 10) },
        { match: /[0-7]+[oO]/, value: (v) => parseInt(v, 8) },
        { match: /[01]+[bB]/, value: (v) => parseInt(v, 2) },
        /[0-9][0-9a-fA-F]*/
    ],

    open_paren: "(",
    close_paren: ")",
    open_bracket: "[",
    close_bracket: "]",
    comma: ",",
    colon: ":",
    dollar: "$",

    operator: [
        "\\", "\\?", "\\%",
        "<<", ">>",
        "!=", "==", ">=", "<=", ">", "<",
        "&&", "||", "&", "|", "^", "~", "!", 
        "+", "-",
        "/", "*", "%",
        "#",
    ]
});

lexer.next = filter_whitespace(lexer);
module.exports = lexer;
