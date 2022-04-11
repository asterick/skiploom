const { resolve } = require("./resolve.js");
const fs = require("fs/promises");
const { isTypedArray } = require("util/types");

const WATERMARK = "skiploom-object";
const OBJECT_VERSION = 1;

const TYPE_UNDEFINED    = 0;
const TYPE_NULL         = 1;
const TYPE_FALSE        = 2;
const TYPE_TRUE         = 3;
const TYPE_PINTEGER     = 4;
const TYPE_NINTEGER     = 5;
const TYPE_DOUBLE       = 6;
const TYPE_STRING       = 7;
const TYPE_ARRAY        = 8;
const TYPE_OBJECT       = 9;
const TYPE_ARRAYBUFFER  = 10;
const TYPE_ILLEGAL      = 11;

class StreamDataView extends DataView {
    constructor (... args) {
        super(... args);

        this.position = 0;
        this.dec = new TextDecoder();
    }

    getNextUint8(... args) {
        return this.getUint8(this.position++, ... args);
    }

    getNextFloat64(... args) {
        const data = this.getFloat64(this.position, ... args);
        this.position += 8;
        return data;
    }

    getArrayBuffer(length) {
        return this.buffer.slice(this.position, this.position += length);
    }

    getString(length) {
        const data = this.getArrayBuffer(length);
        return this.dec.decode(data);
    }

    getInt() {
        let value = 0, byte = 0, shift = 0;

        do {
            byte = this.getNextUint8();
            value |= (byte & 0x7F) << shift;
            shift += 7;
        } while (byte & 0x80);

        return value;
    }
}

function decode(view) {
    const strings = [];
    const tokens = [];
    let count = 1;

    // Generate a flattened view of the object tree
    do {
        switch (view.getInt()) {
        case TYPE_UNDEFINED:
            tokens.push(undefined);
            break ;

        case TYPE_NULL:
            tokens.push(null);
            break ;

        case TYPE_FALSE:
            tokens.push(false);
            break ;

        case TYPE_TRUE:
            tokens.push(true);
            break ;

        case TYPE_PINTEGER:
            tokens.push(view.getInt());
            break ;

        case TYPE_NINTEGER:
            tokens.push(-view.getInt());
            break ;

        case TYPE_DOUBLE:
            tokens.push(view.getNextFloat64(true));
            break ;

        case TYPE_STRING:
            {
                const index = view.getInt();

                if (index >= strings.length) {
                    const string = view.getString(view.getInt());
                    strings.push(string);
                    tokens.push(string);
                } else {
                    tokens.push(strings[index]);
                }
            }
            break ;

        case TYPE_ARRAYBUFFER:
            tokens.push(view.getArrayBuffer(view.getInt()));
            break ;

        case TYPE_ARRAY:
            {
                let length = view.getInt();

                tokens.push ({ type: 'Array', length: length });
                count += length;
            }
            break ;

        case TYPE_OBJECT:
            {
                let length = view.getInt();

                tokens.push ({ type: 'Object', length: length });
                count += length * 2;
            }
            break ;

        default:
            throw new Error("Illegal token found in object file");

        }
    } while (--count > 0);

    // Work backwards to regenerate the structure
    for (let i = tokens.length - 1; i >= 0; i--) {
        const token = tokens[i];
        if (token instanceof ArrayBuffer) {
            continue ;
        } if (token instanceof Object) {
            if (token.type == 'Array') {
                tokens[i] = tokens.splice(i+1,token.length);
            } else if (token.type == 'Object') {
                let count = tokens[i].length;
                let output = {};

                tokens[i] = output;
                while (count-- > 0) {
                    let [key, value] = tokens.splice(i+1, 2);
                    output[key] = value;
                }                            
            }
        }
    }

    return tokens[0];
}

async function load(fn)
{
    const resolved = await resolve(fn);

    // Cannot find file
    if (!resolved.stat) return null;

    const fo = await fs.open(resolved.filename, "r");
    const ab = (await fo.read()).buffer.buffer;
    await fo.close();

    const view = new StreamDataView(ab);

    // Watermark does not match simply move on
    if (view.getString(WATERMARK.length) != WATERMARK) {
        return null;
    }

    const version = decode(view);
    if (version != OBJECT_VERSION) {
        throw new Error(`Cannot process object file version ${version}`);
    }

    return decode(view);
}

function* encode_int(v) {
    do {
        yield (v & 0x7F) | (v < 0x80 ? 0 : 0x80);
        v >>= 7;
    } while (v > 0);
}

function* encode(... stack) {
    const enc = new TextEncoder();
    const strings = [];

    do {
        const object = stack.shift();

        switch (typeof object) {
        case 'undefined':
            yield TYPE_UNDEFINED;
            break ;

        case 'boolean':
            yield object ? TYPE_TRUE : TYPE_FALSE;
            break ;
        
        case 'number':
            if ((object|0) == object) {
                if (object < 0) {
                    yield TYPE_NINTEGER;
                    yield* encode_int(-object);
                } else {
                    yield TYPE_PINTEGER;
                    yield* encode_int(object);
                }
            } else {
                yield TYPE_DOUBLE;
                yield new Float64Array([object]);
            }
            break ;
        
        case 'string':
            yield TYPE_STRING;

            if (strings.indexOf(object) >= 0) {
                yield* encode_int(strings.indexOf(object));
            } else {
                yield* encode_int(strings.push(object) - 1);
                const buff = Buffer.from(object, 'utf-8')
                yield* encode_int(buff.length);
                yield buff;
            }

            break ;

        case 'object':
            if (object === null) {
                yield TYPE_NULL;
            } else if (Array.isArray(object)) {
                yield TYPE_ARRAY;
                yield* encode_int(object.length);
                for (let i = object.length - 1; i >= 0; i--) {
                    stack.unshift(object[i]);
                }
            } else if (object instanceof ArrayBuffer) {
                yield TYPE_ARRAYBUFFER;
                yield* encode_int(object.byteLength)
                yield new Uint8Array(object);
            } else if (ArrayBuffer.isView(object)) {                   
                yield TYPE_ARRAYBUFFER;
                yield* encode_int(object.buffer.byteLength)
                yield object;
            } else {
                let count = 0;
                
                yield TYPE_OBJECT;
                for (const entry of Object.entries(object)) {
                    stack.unshift(... entry);
                    count ++;
                }
                yield* encode_int(count);
            }

            break ;
        default:
            throw new Error(`Encode ${typeof object}`)
        }
    } while (stack.length > 0);
}

async function save(fn, object)
{
    const fout = await fs.open(fn, "w");
    const byte_data = new Uint8Array(4096);
    let byte_count = 0;

    fout.write(WATERMARK);

    object = object.exports;

    for (buffer of encode(OBJECT_VERSION, object)) {
        if (ArrayBuffer.isView(buffer)) {
            await fout.write(byte_data, 0, byte_count);
            await fout.write(buffer);
            byte_count = 0;
        } else {
            byte_data[byte_count++] = buffer;
        }

        // flush our buffer
        if (byte_count >= byte_data.length) {
            await fout.write(byte_data, 0, byte_count);
            byte_count = 0;
        }
    }

    await fout.write(byte_data, 0, byte_count);
    await fout.close();
}

module.exports = {
    load, save
};
