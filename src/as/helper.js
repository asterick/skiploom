function isValueType(ast) {
    return ast.type == "Number" || ast.type == "String";
}

function isNumber(ast) {
    return ast.type == "Number";
}

function isString(ast) {
    return ast.type == "String";
}

function asName(ast) {
    if (ast.name) {
        return ast.name
    }

    throw `Expression does not have a name`;
}

function asString(ast) {
    switch (ast.type) {
    case "String":
        return ast.value;
    case "Number":
        return ast.value.toString();
    default:
        throw `Cannot coerse ${ast.type} to string`;
    }
}

function asNumber(ast) {
    switch (ast.type) {
    case "Number":
        return ast.value;
    default:
        throw `Cannot coerse ${ast.type} to number`;
    }
}

function asTruthy(ast) {
    switch (ast.type) {
    case "Number":
        return ast.value != 0;
    case "String":
        return ast.value !== "";
    default:
        throw `Cannot coerse ${ast.type} to number`;
    }
}

function autoType(value) {
    switch (typeof value) {
    case "object":
        return value ;
    case "string":
        return {
            value,
            type: "String"
        };
    case "boolean":
        value = value ? 1 : 0;
    case "number":
        return {
            value,
            type: "Number"
        };
        break ;
    }
}

module.exports = {
    autoType,
    isValueType, isNumber, isString,
    asNumber, asString, asTruthy, asName,
};
