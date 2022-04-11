const { resolve } = require("./resolve.js");
const fs = require("fs/promises");
const { isTypedArray } = require("util/types");

const WATERMARK = "\x01OBJ";

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

    getString(length) {
        const data = this.getArrayBuffer(length);
        return this.dec.decode(data);
    }

    getArrayBuffer(length) {
        return this.buffer.slice(this.position, this.position += length);
    }

    getNextUint8(... args) {
        return this.getUint8(this.position++, ... args);
    }

    getNextFloat64(... args) {
        const data = this.getFloat64(this.position, ... args);
        this.position += 8;
        return data;
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

function decode(view, strings = []) {
    switch (view.getInt()) {
        case TYPE_UNDEFINED:
            return undefined;
        case TYPE_NULL:
            return null;
        case TYPE_FALSE:
            return false;
        case TYPE_TRUE:
            return true;
        case TYPE_PINTEGER:
            return view.getInt();
        case TYPE_NINTEGER:
            return -view.getInt();
        case TYPE_DOUBLE:
            return view.getNextFloat64(true);
        case TYPE_STRING:
            {
                const index = view.getInt();

                if (index >= strings.length) {
                    const string = view.getString(view.getInt());
                    strings.push(string);
                    return string;
                } else {
                    return strings[index];
                }
                return ;
            }
        case TYPE_ARRAYBUFFER:
            return view.getArrayBuffer(view.getInt());
        case TYPE_ARRAY:
            {
                let length = view.getInt();
                let output = [];

                while (length-- > 0) {
                    output.push(decode(view, strings));
                }
                return output;
            }
        case TYPE_OBJECT:
    }

    return "POOP";
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

    return decode(view);
}

function* encode_int(v) {
    do {
        yield (v & 0x7F) | (v < 0x80 ? 0 : 0x80);
        v >>= 7;
    } while (v > 0);
}

async function* encode(... stack) {
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
                    yield new Float64Array([object]).buffer;
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
                    stack.push(... object);
                } else if (object instanceof ArrayBuffer) {
                    yield TYPE_ARRAYBUFFER;
                    yield new Uint8Array(object);
                } else if (ArrayBuffer.isView(object)) {                   
                    yield TYPE_ARRAYBUFFER;
                    yield* encode_int(object.length)
                    yield object;
                } else {
                    let count = 0;
                    
                    yield TYPE_OBJECT;
                    for (const entry of Object.entries(object)) {
                        stack.push(... entry);
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
 
    object = [undefined, null, true, false, -999, 999, "farts", "a", "farts", new Uint8Array([1,2,3]), 3.14159];

    fout.write(WATERMARK);

    for await(buffer of encode(object)) {
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
