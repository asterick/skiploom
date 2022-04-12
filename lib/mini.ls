{
    "regions": [
        { type: "ram", start: 0x1000, length:   0x1000 },
        { type: "rom", start: 0x2100, length: 0x200000 }
    ],
    "export": [
        { start: 0x200000, length:   0x2100 },
        { start:   0x2100, length: 0x1FDF00 }
    ]
}
