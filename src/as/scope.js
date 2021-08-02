class Scope {
    constructor (globals, top = null) {
        this.globals = globals;
        this.top = Object.create(top || globals);
    }

    scope () {
        return new Scope(this.globals, this.top);
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

    remove(name) {
        let tree = this.top;

        do {
            if (tree.hasOwnProperty(name)) {
                delete tree[name];
            }

            tree = Object.getPrototypeOf(tree);
        } while (tree != Object.prototype);
    }

    toString() {
        return JSON.stringify(this.top);
    }
}

module.exports = {
    Scope
};
