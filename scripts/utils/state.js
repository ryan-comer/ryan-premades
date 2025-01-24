import {
    debug,
    log,
    info,
    error
} from "../utils/logging.js"

// Get an effect on an actor
function getEffect(actor, effectName) {
    return actor.effects.values().find(val => val.name == effectName)
}

// Save the state for an actor
export async function setState(actor, effectName, name, value) {
    debug(`Updating state ${name} with ${value}`)
    // Get the effect
    let effect = getEffect(actor, effectName)
    debug("Found effect: ", effect)
    debug("Found effect(copy): ", {...effect})

    // If the effect doesn't exist, create it
    if (effect === undefined) {
        let newEffect = {
            name: effectName,
            changes: [
                { key: name, mode: 0, value: value }
            ]
        }
        debug("Initializing effect: ", newEffect)
        await actor.createEmbeddedDocuments('ActiveEffect', [newEffect])
    } else {
        // Make a copy to allow for editing
        let copiedEffect = {...effect}
        copiedEffect._id = effect._id

        // Update the effect
        let change = copiedEffect.changes.find(val => val.key == name)
        if (change === undefined) {
            debug("Couldn't find change, creating new")
            copiedEffect.changes.push({ key: name, mode: 0, value: value })
        } else {
            debug("Using existing change")
            change.value = value
        }
        debug("Updating effect: ", copiedEffect)
        debug(copiedEffect)
        await actor.updateEmbeddedDocuments('ActiveEffect', [copiedEffect])
    }
}

// Get the state of an actor
export function getState(actor, effectName, name) {
    debug("Getting state: ", effectName)
    // Get the effect
    let effect = getEffect(actor, effectName)

    // If the effect doesn't exist, return undefined
    if (effect === undefined) {
        return undefined
    } else {
        // Return the value of the change
        let change = effect.changes.find(val => val.key == name)
        if (change === undefined) {
            return undefined
        } else {
            debug(`Getting state: ${name}\tValue: ${change.value}`)
            return change.value
        }
    }
}