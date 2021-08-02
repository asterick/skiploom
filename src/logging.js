const LEVEL_FATAL = 0;
const LEVEL_FAIL = 1;
const LEVEL_WARN = 2;
const LEVEL_INFO = 3;

const LevelName = {
    [LEVEL_FATAL]: "Fatal",
    [LEVEL_FAIL]: "Error",
    [LEVEL_WARN]: "Warning",
    [LEVEL_INFO]: "Message",
}

class Message {
    constructor(level, location, message) {
        this.level = level;
        this.location = location;
        this.message = message;
    }

    toString() {
        if (this.location) {
            return `${LevelName[this.level]} (${this.location.line}:${this.location.col}): ${this.message}`;
        } else {
            return `${LevelName[this.level]}: ${this.message}`;
        }
    }
}

module.exports = {
    LEVEL_FATAL,
    LEVEL_FAIL,
    LEVEL_WARN,
    LEVEL_INFO,

    Message
};
