export function debug(message, ...args) {
    printMessage(message, 'debug', ...args)
}

export function error(message, ...args) {
    printMessage(message, 'error', ...args)
}

export function info(message, ...args) {
    printMessage(message, 'info', ...args)
}

export function log(message, ...args) {
    printMessage(message, 'log', ...args)
}

function printMessage(message, type, ...args) {
    message = `Ryan's Premades: ${message}`
    if (type === "error") {
        console.error(message, ...args)
    } else if (type === "debug") {
        console.debug(message, ...args)
    } else if (type === "info") {
        console.info(message, ...args)
    } else {
        console.log(message, ...args)
    }
}