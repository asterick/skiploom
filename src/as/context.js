const {
    isValueType, autoType,
    asNumber, asString, asTruthy, asName,
} = require("./helper.js");

const { uuid } = require("../util/uuid.js");

class Context {
    constructor(parent, top = null) {
        Object.assign(this, {
            ...parent,
            name: uuid(),
            top: top || Object.create(parent.globals)
        });
    }

    radix() {
        return asNumber(this.get('radix').value);
    }

    clone() {
        return new Context(this, this.top);
    }

    nest() {
        return new Context(this, Object.create(this.top));
    }

    reference(name) {
        if (this.globals.hasOwnProperty(name)) {
            return this.globals[name];
        } else if (!this.top[name]) {
            this.top[name] = {};
        }

        return this.top[name];
    }

    get(name) {
        return this.top[name];
    }

    local(name) {
        let ref = this.reference(name);

        if (ref.global) {
            throw `Global ${name} is already defined`;
        }

        ref.local = true;

        return ref;
    }

    global(name) {
        let ref = this.reference(name);

        if (!ref.global) {
            if (ref.local) {
                throw `Cannot promote local of name ${name}`;
            } else if (this.global[name]) {
                throw `Global of name ${name} already exists`;
            }

            Object.assign(ref, { global: true, frozen: true });
            this.globals[name] = ref;
        }

        return ref;
    }

    isNear(name) {
        return this.top.hasOwnProperty(name);
    }

    nearVariables() {
        return Object.keys(this.top);
    }

    toString() {
        return JSON.stringify(this.top);
    }

    remove(name) {
        let top = this.top;

        do {
            if (top.hasOwnProperty(name)) {
                delete top[name];
                break;
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
                target[name] = { ...value };
            }
        }

        // Create a mirrored context (mutable)
        return new Context(globals, target);
    }

    // Conditionally combine mirrored contexts
    prospect(test, left, right) {
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
                    ...Object.keys(here),
                    ...Object.keys(onTrue),
                    ...Object.keys(onFalse),
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
                        Object.assign(here[name], {
                            used: (here[name].used || onTrue[name].used || onFalse[name].used),
                            value: {
                                type: "TernaryOperation",
                                test,
                                onTrue: onTrue[name].value,
                                onFalse: onFalse[name].value,
                            }
                        });
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
    Context
};
