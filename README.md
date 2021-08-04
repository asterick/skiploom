# pokemon-toolchain
Assembler / Linker compatible with the assembly syntax of the Epson S1C88 toolchain

## Things remaining
* Allow for un-balanced definitions as the result of prospecting
* Add @LOW and @HIGH to function calls (MODEL and LST will not be added)
* Final directives:
    * "DataAllocateDirective": This creates a number of uninitialized bytes
    * "DispatchDirective": Assembly instruction
    * "SectionDirective": sets the section for this chunk
    * "AlignDirective": similar to "DataAllocateDirective", but sets chunk to round elements based on origin
    * "NameDirective": basically useless
    * "DefineSectionDirective": defines properties of a section
    * "Fragment": used to define position of a label
 * Need to actually start resolving addresses of fragments

## Differences from AS88
* @DEF and @MXP only take symbols, behavior may vary
* labels are local by default
