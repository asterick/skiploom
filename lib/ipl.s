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
        GLOBAL WEAK _interrupt_handler\?irq
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
        EXTERN (CODE) _start

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

       END
