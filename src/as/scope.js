class Scope {
    constructor (globals, top = null) {
        this.globals = globals;
        this.top = top || globals;
    }

    nest () {
        return new Scope(this.globals, Object.create(this.top));
    }

    local(name) {
        if (this.globals.hasOwnProperty(name)) {
            throw `Global ${name} is already defined`;
        } else if (!this.top.hasOwnProperty(name)) {
            // Empty local container
            this.top[name] = { };
        }

        return this.top[name];
    }

    isNear(name) {
        return this.top.hasOwnProperty(name);
    }

    global(name) {
        if (this.top[name]) {
            if (this.top[name] != this.globals[name]) {
                throw `Local of name ${name} already exists`;
            }
        } else {
            // Create container for variable
            this.globals[name] = { frozen: true };
        }

        return this.top[name];
    }

    get(name) {
        return this.top[name];
    }

    toString() {
        return JSON.stringify(this.top);
    }

    remove (name) {
        let top = this.top;

        do {
            if (top.hasOwnProperty(name)) {
                delete top[name];
                break ;
            }

            top = Object.getPrototypeOf(top);
        } while (top != Object.prototype);
    }

    // Create a snapshot of the current variable tree
    preserve() {
        const chain = [];
        let top = this.top;

        // Walk up our prototype chain
        do {
            chain.push(top);
            top = Object.getPrototypeOf(top);
        } while (top != Object.prototype);

        let target = Object.prototype;
        let globals = null;

        while (top = chain.pop()) {
            // Create 1 deep shallow copy
            target = Object.create(target);
            if (!globals) globals = target;

            for (const [name, value] of Object.entries(top)) {
                target[name] = { ... value };
            }
        }

        // Create a mirrored scope (mutable)
        return new Scope(globals, target);
    }

    // Conditionally combine mirrored scopes
    prospect(condition, left, right) {
        // Walk up our prototype chain

        let here = this.top;
        let onTrue = left.top;
        let onFalse = right.top;

        do {
            let names;

            // Get unique set of all names defined
            if (here == this.globals) {
                // Only global namespace can mutate keys
                names = new Set([
                    ... Object.keys(here),
                    ... Object.keys(onTrue),
                    ... Object.keys(onFalse),
                ]);
            } else {
                names = Object.keys(here);
            }

            for (const name of names) {
                const true_val = onTrue[name] && onTrue[name].value;
                const false_val = onFalse[name] && onFalse[name].value;

                if (true_val && false_val) {
                    // If the value has changed, We need to setup a conditional
                    if (here[name].value != true_val || true_val != false_val) {
                        // This has no location yet
                        here[name].value = {
                            type: "TernaryOperator",
                            condition,
                            onTrue: onTrue[name].value,
                            onFalse: onFalse[name].value,
                        }
                    }
                } else if (!true_val && !false_val) {
                    // Both sides were undefined
                    delete here[name];
                } else if (!true_val) {
                    throw "TODO: Need to detect unbalanced defines"
                } else if (!false_val) {
                    throw "TODO: Need to detect unbalanced defines"
                }
            }

            // Continue up the tree
            here = Object.getPrototypeOf(here);
            onTrue = Object.getPrototypeOf(onTrue);
            onFalse = Object.getPrototypeOf(onFalse);
        } while (here != Object.prototype);
    }
}

module.exports = {
    Scope
};
