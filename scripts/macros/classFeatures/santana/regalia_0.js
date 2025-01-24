import {
  playerOwnsActor
} from "../../../utils/players.js"

import {
  getState,
  setState,
} from "../../../utils/state.js"

import {
  debug,
  error,
  info,
  log
} from "../../../utils/logging.js"

// Class feature for Santana Regalia 0
// Track the amount of damage done during the turn by the character who has this feat
// Generate an orb for every N damage done
// At the end of the turn, spend the orbs for a bonus effect

const feat = {
  "name": "Santana Regalia 0",
  "type": "feat",
  "img": "modules/ryan-premades/images/santana/orb.webp"
}

const stateName = "Santana State"

// Check if the feat is active on the actor
function isActive(actor) {
  return actor.items.some(item => item.name === feat.name)
}

// Track the damage from a workflow
async function trackDamage(workflow) {
  // Get the damage from the workflow
  const damage = workflow.healingAdjustedDamageTotal

  // Get the current damage from the actor
  const currentDamage = getDamage(workflow.actor) || 0

  // Update the damage
  let newDamage = currentDamage
  if (damage > 0) {
    newDamage = currentDamage + damage
  }

  await updateDamage(workflow.actor, newDamage)

  return newDamage
}

// Get the damage from an actor
function getDamage(actor) {
  return Number(getState(actor, stateName, "damage"))
}

// Update the damage
async function updateDamage(actor, damage) {
  await setState(actor, stateName, "damage", damage)
}

// Reset the damage
async function resetDamage(actor) {
  await updateDamage(actor, 0)
}

// Get the number of orbs from the damage
function getOrbs(actor, damage) {
  // Cap number of orbs at the proficiency bonus
  return Math.min(Math.floor(damage / 10), actor.system.attributes.prof)
}

async function damageBuff(actor, numOrbs) {
  const attackBonus = numOrbs
  const damageBonus = numOrbs * 2

  const token = actor.getActiveTokens()[0]

  // Add the effect to the actor
  const effectData = {
    label: 'Regalia Damage Boost',
    changes: [{
        key: "system.bonuses.mwak.attack",
        value: `+${attackBonus}`,
        mode: CONST.ACTIVE_EFFECT_MODES.ADD
      },
      {
        key: "system.bonuses.mwak.damage",
        value: `+${damageBonus}`,
        mode: CONST.ACTIVE_EFFECT_MODES.ADD
      }
    ]
  }

  const createdEffect = await actor.createEmbeddedDocuments("ActiveEffect", [effectData])
  const effectId = createdEffect[0].id

  // Save the effect ID to the actor so it can be removed later
  actor.setFlag("ryan-premades", "damageEffectId", effectId)

  // Play the effect
  new Sequence()
    .effect()
    .file('jb2a.condition.boon.01.001.green')
    .atLocation(token)
    .play()
}

async function healing(actor, numOrbs) {
  let healingAmount = 4 * numOrbs; // The amount of healing to apply
  const token = actor.getActiveTokens()[0]; // The token to apply the healing to

  const maxHealth = actor.system.attributes.hp.effectiveMax
  healingAmount = Math.min(healingAmount, maxHealth - actor.system.attributes.hp.value)


  // Apply the healing
  actor.update({
    "system.attributes.hp.value": actor.system.attributes.hp.value + healingAmount
  });

  // Create the healing effect
  new Sequence()
    .effect()
    .file('jb2a.healing_generic.200px.green')
    .atLocation(token)
    .play()

  const chatMessage = `${token.name} is healed for ${healingAmount} HP!`;
  ChatMessage.create({
    content: chatMessage
  });
}

// Prompt the user on how to spend the orbs
function promptUser(actor, numOrbs) {
  // Check if there are orbs to spend
  if (numOrbs === 0) return

  new Dialog({
    title: "Orbs",
    content: `<p>How do you want to spend your ${numOrbs} orbs?:</p>`,
    buttons: {
      option1: {
        label: "Damage",
        callback: () => {
          damageBuff(actor, numOrbs);
        },
      },
      option2: {
        label: "Healing",
        callback: () => {
          healing(actor, numOrbs);
        },
      },
    },
    default: "option1",
  }).render(true);
}

function clearOrbEffects(actor) {
  for (let i = 0; i < 4; i++) {
    try {
      Sequencer.EffectManager.endEffects({
        name: `santana_orb_${i}`,
        object: actor.getActiveTokens()[0].id,
      })
    } catch (e) {
      console.error(e)
    }
  }
}

// Update the effect for the orbs
function updateOrbEffects(actor, numOrbs) {
  // Clear existing orbs
  clearOrbEffects(actor)

  const token = actor.getActiveTokens()[0]

  const offsets = [{
      x: 100,
      y: 0
    },
    {
      x: 0,
      y: -100
    },
    {
      x: -100,
      y: 0
    },
    {
      x: 0,
      y: 100
    },
  ]
  const files = [
    "jb2a.lightning_orb.01.loop",
    "jb2a.lightning_orb.01.loop",
    "jb2a.lightning_orb.01.loop",
    "jb2a.lightning_orb.01.loop",
  ]

  // Create the orbs
  for (let i = 0; i < Math.min(numOrbs, 4); i++) {
    new Sequence()
      .effect()
      .file(files[i])
      .attachTo(token.id, {
        offset: offsets[i]
      })
      .scale(0.5)
      .name(`santana_orb_${i}`)
      .fadeIn(500)
      .fadeOut(500)
      .duration(100000000)
      .play();
  }
}

// Register the hooks
export function init() {
  info("Initializing Santana Regalia 0")
  // Track the damage from a roll
  Hooks.on("midi-qol.RollComplete", async workflow => {
    debug("Starting RollComplete flow")
    console.dir(workflow)

    // Check if the actor has the feat
    if (!isActive(workflow.actor)) return

    // Check if the token is in combat
    const token = workflow.actor.getActiveTokens()[0]
    if (!token.inCombat) return

    const currentDamage = await trackDamage(workflow)
    const numOrbs = getOrbs(workflow.actor, currentDamage)

    debug(`Current damage: ${currentDamage}, Orbs: ${numOrbs}`)
    updateOrbEffects(workflow.actor, numOrbs)
  })

  Hooks.on("midi-qol.DamageRollComplete", workflow => {
    debug("Starting DamageRollComplete flow")
    console.dir(workflow)

    // Check if there is a damage effect to remove
    const effectId = workflow.actor.getFlag("ryan-premades", "damageEffectId")
    if (effectId) {
      // Remove the effect
      workflow.actor.deleteEmbeddedDocuments("ActiveEffect", [effectId])

      // Clear the effect ID
      workflow.actor.setFlag("ryan-premades", "damageEffectId", null)
    }
  })

  // Prompt the user on how to spend the orbs at the end of their turn
  Hooks.on("combatTurn", async (combat, turn) => {
    debug("Starting combatTurn flow")
    console.dir(combat)
    console.dir(turn)

    let currentTurn = turn.turn
    let previousTurn = turn.turn - 1

    const currentActor = combat.turns[currentTurn]?.actor
    const previousActor = previousTurn >= 0 ? combat.turns[previousTurn]?.actor : null

    // Reset orbs if current actor has the feat
    if (currentActor && isActive(currentActor) && playerOwnsActor(currentActor)) {
      resetDamage(currentActor)
      clearOrbEffects(currentActor)
    }

    // Check if the previous turn was the actor with the feat
    if (!previousActor || !isActive(previousActor || !playerOwnsActor(previousActor))) return

    // Get the damage from the actor and prompt the user
    const damage = getDamage(previousActor) || 0
    const numOrbs = getOrbs(previousActor, damage)
    promptUser(previousActor, numOrbs)

    // Reset the damage
    resetDamage(previousActor)
    clearOrbEffects(previousActor)
  })

  Hooks.on("combatRound", async (combat, turn) => {
    debug("Starting combatRound flow")
    console.dir(combat)
    console.dir(turn)

    let currentTurn = turn.turn
    let previousTurn = combat.turns.length - 1

    const currentActor = combat.turns[currentTurn]?.actor
    const previousActor = previousTurn >= 0 ? combat.turns[previousTurn]?.actor : null

    // Reset orbs if current actor has the feat
    if (currentActor && isActive(currentActor) && playerOwnsActor(currentActor)) {
      resetDamage(currentActor)
      clearOrbEffects(currentActor)
    }

    // Check if the previous turn was the actor with the feat
    if (!previousActor || !isActive(previousActor || !playerOwnsActor(previousActor))) return

    // Get the damage from the actor and prompt the user
    const damage = getDamage(previousActor) || 0
    const numOrbs = getOrbs(previousActor, damage)
    promptUser(previousActor, numOrbs)

    // Reset the damage
    resetDamage(previousActor)
    clearOrbEffects(previousActor)
  })
}