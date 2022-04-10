; Define our memory layout
region ram 0x1000 0x1000
region rom 0x2100 0x200000

; Define how we export to file (we wrap mirror around)
export 0x200000 0x2100
export 0x2100 0x1FFFFF
