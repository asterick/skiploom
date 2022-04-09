static volatile char *reg = (volatile char *)0x20FF;

int added_call(void) {
    *reg = 0x99;
    return 0;
}
