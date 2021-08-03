    ;Z EQU 192
    ;INFO 192 + 256

    EXTERN (CODE, SHORT) poopiedoop
    INCLUDE "./include.s" ;USING "text.transform.js"

    MSG 1
    WARN 2
    FAIL 3
some_label:

;TEST_M MACRO A, B, C, D
    ;LD A, I\A
    ;LD A, I\?B
    ;LD A, I\%C
    ;ASCII "D"
    ;ENDM

    ;TEST_M Z, Z, Z, Z

    GLOBAL A
    LOCAL  B
    DEFINE Q 'bert'

    B SET #01
    B SET B + 2

    IF 0
        WARN "This does nothing"
    ELSE
        FAIL "This did something"
    ENDIF

    IF A == 1
        B SET B + 02
        WARN B
    ELSEIF A == 2
        B SET B + 03
    ELSEIF ""
        WARN C
    ELSE
        B SET B + 04
        WARN B
    ENDIF
