@{% const lexer = require("./lexer.js"); %}
@lexer lexer

main -> expression comment %linefeed {% (data) => data %}

expression -> 
      null
    | string {% id %}

comment -> 
      null
    | %comment {% id %}

# Atomic values
string ->
      %string_start string_body:* %string_end  {% (data) => data[1].join("") %}

string_body ->
      %characters {% (data) => data[0].value %}
    | %escaped {% (data) => data[0].value %}
