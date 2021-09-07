# pokemon-toolchain
Assembler / Linker compatible with the assembly syntax of the Epson S1C88 toolchain

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

## Differences from AS88
* @DEF and @MXP only take symbols, behavior may vary
* labels are local by default
* iteration counter for DUP* directives are symbols not labels
