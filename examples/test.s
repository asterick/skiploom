    Z EQU 123

TEST_M MACRO A, B, C, D
    I\A SET 0
    I\?B SET 0
    I\%C SET 0
    LD A, I\A
    LD A, I\?B
    LD A, I\%C
    ASCII "D"
    ENDM

    TEST_M Z, Z, Z, Z
    PMACRO TEST_M
