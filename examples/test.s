    Z EQU 123

TEST_M MACRO A, B, C, D
    I\A SET 1
    I\?B SET 2
    I\%C SET 3
    DB I\A, I\?B, I\%C
    ENDM

    TEST_M Z, Z, Z, Z
    PMACRO TEST_M
