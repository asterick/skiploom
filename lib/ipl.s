; ===
; === Interrupt vector table
; ===
        DEFSECT ".irq_vectors", CODE, FIT 8000H, ROMDATA AT 2100H
        SECT ".irq_vectors", REQUIRED
        ; Setup our interrupt vectors
        JRL    _scatter_load
        index DUP 25
        ALIGN 6
        JRL _interrupt_handler\?index
        ENDM

; ===
; === Weak interrupt handlers
; ===
irq DUPA flag, 277h, 276h, 275h, 274h, 273h, 272h, 271h, 270h, 285h, 284h, 283h, 282h, 2A7h, 2A6h, 297h, 296h, 295h, 294h, 293h, 292h, 291h, 290h, 2A2h, 2A1h, 2A0h, 280h
        DEFSECT (".irq_weak_handler" .. irq), CODE, FIT 8000H
        SECT ".irq_weak_handler"
_interrupt_handler\?irq:
        PUSH BR
        LD BR, #20h
        LD [BR:(flag >> 4)], #(1 << (flag & 0fh))
        POP BR
        RETE
ENDM

; ===
; === Memory scatter loader
; ===

        DEFSECT ".init_ram", CODE, FIT 8000H, ROMDATA
        SECT ".init_ram"
_scatter_load:
        ; This will initialize ram
        JRL _start

        ; Setup externals
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
        GLOBAL WEAK _interrupt_handler25
        EXTERN (CODE) _start

        END
