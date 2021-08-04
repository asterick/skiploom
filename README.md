# pokemon-toolchain
Assembler / Linker compatible with the assembly syntax of the Epson S1C88 toolchain

## Things remaining
* Allow for un-balanced definitions as the result of prospecting
* Allow for forward decls to be passed to a macro
* Add @LOW and @HIGH to function calls (MODEL and LST will not be added)
* Final directives:
    * "DataAllocateDirective"
    * "DispatchDirective"
    * "SectionDirective"
    * "AlignDirective"
    * "NameDirective"
    * "DefineSectionDirective"
    * "Fragment"
 * Need to actually start resolving addresses of fragments

## Differences from AS88
* @DEF and @MXP only take symbols, behavior may vary
* labels are local by default
