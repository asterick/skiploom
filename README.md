# S1C88 Toolchain
Assembler / Linker compatible with the assembly syntax of the Epson S1C88 toolchain, targeting the pokemon mini

## Things remaining
* Final directives:
    * "DefineSectionDirective": defines properties of a section
    * "DataAllocateDirective": This creates a number of uninitialized bytes
    * "SectionDirective": sets the section for this chunk
    * "AlignDirective": similar to "DataAllocateDirective", but sets chunk to round elements based on origin
    * "Fragment": used to define position of a label
 * Resolve fragments (with sliding ranges)
 * Noticing conditions or registers in complex expressions should throw a failure
 * Allow for un-balanced definitions as the result of prospecting
 * BSON decoding should not use stack as deep trees will kill the interpreter

## Differences from AS88
* @DEF and @MXP only take symbols, behavior may vary
* labels are local by default
* iteration counter for DUP* directives are symbols not labels
