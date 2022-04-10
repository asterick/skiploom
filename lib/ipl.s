        GLOBAL WEAK _interrupt_handler0
        GLOBAL WEAK _interrupt_handler1
        GLOBAL WEAK _interrupt_handler2
        GLOBAL WEAK _interrupt_handler3
        GLOBAL WEAK _interrupt_handler4
        GLOBAL WEAK _interrupt_handler5
        GLOBAL WEAK _interrupt_handler6
        GLOBAL WEAK _interrupt_handler7
        GLOBAL WEAK _interrupt_handler8
        GLOBAL WEAK _interrupt_handler9
        GLOBAL WEAK _interrupt_handler10
        GLOBAL WEAK _interrupt_handler11
        GLOBAL WEAK _interrupt_handler12
        GLOBAL WEAK _interrupt_handler13
        GLOBAL WEAK _interrupt_handler14
        GLOBAL WEAK _interrupt_handler15
        GLOBAL WEAK _interrupt_handler16
        GLOBAL WEAK _interrupt_handler17
        GLOBAL WEAK _interrupt_handler18
        GLOBAL WEAK _interrupt_handler19
        GLOBAL WEAK _interrupt_handler20
        GLOBAL WEAK _interrupt_handler21
        GLOBAL WEAK _interrupt_handler22
        GLOBAL WEAK _interrupt_handler23
        GLOBAL WEAK _interrupt_handler24

        DEFSECT ".irq_vectors", CODE, FIT 8000H, ROMDATA AT 2100H
        ; Setup our interrupt vectors
        JRL    _main
        index DUP 25
        ALIGN 6
        JRL _interrupt_handler\?index
        ENDM

        DEFSECT ".irq_weak_handler", CODE, FIT 8000H
        index DUP 25
_interrupt_handler\?index:
        ENDM
        RETI

        WARN "poot"

        ;END
