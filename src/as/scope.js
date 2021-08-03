class Scope {
    constructor (globals, top = null) {
        this.globals = globals;
        this.top = top || Object.create(globals);
    }

    scope () {
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

        while (top = chain.shift()) {
            // Create 1 deep shallow copy
            target = Object.create({}, target);
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

        let top = this.top;
        do {
            for (const name of Object.names(top)) {
                console.log(name)
            }

            top = Objec.tgetPrototypeOf(top);
            left = Object.getPrototypeOf(left);
            right = Object.getPrototypeOf(right);
        } while (top != Object.prototype);
    }
}

module.exports = {
    Scope
};
