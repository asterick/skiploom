    TMP EQU 123

    IF @DEF(TMP)
        MSG "IT EXISTS (but might not have a value yet)"
    ENDIF

    loop DUP 5
    ;WARN "Just some warnings for ya: ", loop
    ENDM

    loop DUPA counter, 1, 2, 3, 4, 5
    ;WARN "Just some warnings for ya: ", loop, " ", counter
    ENDM

    loop DUPC counter, "Hello World"
    ;WARN "Just some warnings for ya: ", loop, " ", counter
    ENDM

    loop DUPF counter, 25, 0, -5
    ;WARN "Just some warnings for ya: ", loop, " ", counter
    ENDM

TEST_M MACRO A1, A2, A3, D
    I\A1 SET 1
    I\?A2 SET 2
    I\%A3 SET 3
    DB I\A1, I\?A2, I\%A3
    DW 1,2,3
        DUPF count, 3, @CNT() - 1
            MSG "Argument: ", count, " ", @ARG(count)
        ENDM
    ENDM

    TEST_M TMP, TMP, TMP, 1, 2, 3
    PMACRO TEST_M
