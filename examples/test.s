    Z EQU 123

    IF @DEF(Z)
        MSG "IT EXISTS (but might not have a value yet)"
    ENDIF

    loop DUP 5
    WARN "Just some warnings for ya: ", loop
    ENDM

    loop DUPA counter, 1, 2, 3, 4, 5
    WARN "Just some warnings for ya: ", loop, " ", counter
    ENDM

    loop DUPC counter, "Hello World"
    WARN "Just some warnings for ya: ", loop, " ", counter
    ENDM

    loop DUPF counter, 25, 0, -5
    WARN "Just some warnings for ya: ", loop, " ", counter
    ENDM

TEST_M MACRO A, B, C, D
    I\A SET 1
    I\?B SET 2
    I\%C SET 3
    DB I\A, I\?B, I\%C
    DW 1,2,3
        DUPF count, 3, @CNT() - 1
            MSG "Argument: ", count, " ", @ARG(count)
        ENDM
    ENDM

    TEST_M Z, Z, Z, 1, 2, 3
    PMACRO TEST_M
