    LOCAL Z
    X SET 100
    Y EQU farts
    Z EQU X
    R EQU Q
    Q EQU R
    EXTERN (code, SHORT) TEMP
    WARN "Just some debugging", X, Z, R, Q
    DEFINE GG 192
    UNDEF GG
farts:

TEST_M MACRO A, B, C, D
    LD A, I\A
    LD A, I\?B
    LD A, I\%C
    ASCII "D"
    ENDM

    TEST_M Z, Z, Z, Z
