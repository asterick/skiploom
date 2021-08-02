    LOCAL Z
    X SET 100
    Y EQU farts
    Z EQU X
    R EQU Q+1
    Q EQU R+1
    EXTERN (code, SHORT) TEMP
    WARN X, "Hello dolly"

farts:

TEST_M MACRO A, B, C, D
    LD A, I\A
    LD A, I\?B
    LD A, I\%C
    ASCII "D"
    ENDM

    TEST_M Z, Z, Z, Z
