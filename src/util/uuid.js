const prefix = `${(+Date.now()).toString(16)}-${process.pid.toString(16)}`
let timestamp = 0;
let incrementer = 0;

// Note: This will not be unique if the process returns in less than a millisecond
function uuid() {
    const now = +Date.now();

    if (timestamp != now) {
        timestamp = now;
        incrementer = 0;
    } else {
        incrementer++;
    }

    return `uuid(${prefix}-${now.toString(16)}-${incrementer.toString(16)})`;
}

module.exports = {
    uuid
};
