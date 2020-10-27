// Creatively deep copy without worrying about circular references mucking everything up
function deepcopy(object, wm) {
    // Value types can just continue on their way.
    if (typeof object != "object") return object;

    // Verify this is not a circular reference
    if (!wm) {
        wm = new WeakMap();
    } else {
        const cached = wm.get(object);
        if (cached) return cached;
    }

    // Clone the array
    let result;
    if (Array.isArray(object)) {
        wm.set(object, result = []);
        for (let v of object) result.push(deepcopy(v, wm));
    } else {
        wm.set(object, result = {});
        for (const [key, value] of Object.entries(object)) {
            result[key] = deepcopy(value, wm);
        }
    }

    return result;
}

module.exports = deepcopy;
