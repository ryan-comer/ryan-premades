import { playerOwnsActor } from "../../../utils/players.js"

// Class feature for Santana Regalia 0
// Track the amount of damage done during the turn by the character who has this feat
// Generate an orb for every N damage done
// At the end of the turn, spend the orbs for a bonus effect

export const feat = {
    "name": "Santana Regalia 0",
    "type": "feat",
    "img": "modules/ryan-premades/images/santana/orb.webp"
}

// Check if the feat is active on the actor
function isActive(actor) {
    return actor.items.some(item => item.name === feat.name)
}

// Track the damage from a workflow
function trackDamage(workflow) {
    console.dir(workflow)
    if (!isActive(workflow.actor)) return
    console.log("Tracking damage")

    // Get the damage from the workflow
    const damage = workflow.healingAdjustedDamageTotal
    console.log(`Damage: ${damage}`)

    // Get the current damage from the actor
    const currentDamage = Number(workflow.actor.getFlag("ryan-premades", "damage")) || 0
    console.log(`Current damage: ${currentDamage}`)
    
    // Update the damage
    workflow.actor.setFlag("ryan-premades", "damage", currentDamage + damage)
}

// Reset the damage
function resetDamage(actor) {
    console.log("RESETTING DAMAGE")
    actor.setFlag("ryan-premades", "damage", 0)
}

// Get the number of orbs from the damage
function getOrbs(damage) {
    return Math.floor(damage / 10)
}

function damage(numOrbs) {
  console.log(`Dealing ${numOrbs} damage`)
}

function healing(numOrbs) {
  console.log(`Healing ${numOrbs} health`)
}

// Prompt the user on how to spend the orbs
function promptUser(numOrbs) {
  console.log("Prompting user with dialog")
  new Dialog({
    title: "Orbs",
    content: `<p>How do you want to spend your ${numOrbs} orbs?:</p>`,
    buttons: {
      option1: {
        label: "Damage",
        callback: () => {
          damage(numOrbs);
        },
      },
      option2: {
        label: "Healing",
        callback: () => {
          healing(numOrbs);
        },
      },
    },
    default: "option1",
  }).render(true);
}

// Register the hooks
export function init() {
    // Track the damage from a roll
    Hooks.on("midi-qol.RollComplete", workflow => {
        trackDamage(workflow)
    })

    // Prompt the user on how to spend the orbs at the end of their turn
    Hooks.on("combatTurn", async (combat, turn) => {
        console.dir(combat)
        console.dir(turn)
        let currentTurn = turn.turn
        let previousTurn = turn.turn - 1

        const currentActor = combat.turns[currentTurn]?.actor
        const previousActor = previousTurn >= 0 ? combat.turns[previousTurn]?.actor : null

        console.dir(currentActor)
        console.dir(previousActor)

        console.log(isActive(previousActor))
        console.log(playerOwnsActor(previousActor))

        // Check if the previous turn was the actor with the feat
        if (!previousActor || !isActive(previousActor || !playerOwnsActor(previousActor))) return
        
        // Get the damage from the actor and prompt the user
        console.log("Getting damage")
        const damage = previousActor.getFlag("ryan-premades", "damage") || 0
        console.log(`Damage: ${damage}`)
        const numOrbs = getOrbs(damage)
        console.log(`Orbs: ${numOrbs}`)
        promptUser(numOrbs)

        // Reset the damage
        resetDamage(previousActor)
    })

    Hooks.on("combatRound", async (combat, turn) => {
        console.dir(combat)
        console.dir(turn)
        let currentTurn = turn.turn
        let previousTurn = combat.turns.length - 1

        const currentActor = combat.turns[currentTurn]?.actor
        const previousActor = previousTurn >= 0 ? combat.turns[previousTurn]?.actor : null

        console.dir(currentActor)
        console.dir(previousActor)

        console.log(isActive(previousActor))
        console.log(playerOwnsActor(previousActor))

        // Check if the previous turn was the actor with the feat
        if (!previousActor || !isActive(previousActor || !playerOwnsActor(previousActor))) return
        
        // Get the damage from the actor and prompt the user
        console.log("Getting damage")
        const damage = previousActor.getFlag("ryan-premades", "damage") || 0
        console.log(`Damage: ${damage}`)
        const numOrbs = getOrbs(damage)
        console.log(`Orbs: ${numOrbs}`)
        promptUser(numOrbs)

        // Reset the damage
        resetDamage(previousActor)
    })
}