static volatile char *reg = (volatile char *)0x20FF;
const char rega = 0x1F;
char regb = 19;
char regc;

void _interrupt(0) interupt_handler0(void) {
    // TODO
}

int added_call(void) {
    *reg = 0x99;
    return 0;
}
