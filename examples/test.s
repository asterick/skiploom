    ;Z EQU 192
    ;INFO 192 + 256

    ;INCLUDE "./include.s" ;USING "text.transform.js"

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

    IF A == 1
        B SET B + 02
    ELSEIF A == 2
        B SET B + 03
    ELSE
        B SET B + 04
    ENDIF
