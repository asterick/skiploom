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
        LD A, #00
    ELSEIF B == 1
        LD A, #01
    ELSE
        LD A, #02
    ENDIF
