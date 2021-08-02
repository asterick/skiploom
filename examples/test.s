    LOCAL Z
    X SET 100
    Y EQU 0FEh
    EXTERN (code, SHORT) TEMP

TEST_M MACRO A, B, C, D
    LD A, I\A
    LD A, I\?B
    LD A, I\%C
    ASCII "D"
    ENDM

    TEST_M Z, Z, Z, Z
