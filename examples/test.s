    GLOBAL RR
    LOCAL Z
    X SET 100
    Y EQU farts
    Z EQU X
    EXTERN (code, SHORT) TEMP
    WARN "Just some debugging", X, Z
    DEFINE GG 192
    UNDEF GG
    LD RR
farts:

TEST_M MACRO A, B, C, D
    LD A, I\A
    LD A, I\?B
    LD A, I\%C
    ASCII "D"
    ENDM

    TEST_M Z, Z, Z, Z
