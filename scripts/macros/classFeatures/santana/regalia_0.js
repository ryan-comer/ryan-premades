import {
  playerOwnsActor
} from "../../../utils/players.js"

// Class feature for Santana Regalia 0
// Track the amount of damage done during the turn by the character who has this feat
// Generate an orb for every N damage done
// At the end of the turn, spend the orbs for a bonus effect

const feat = {
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
  if (!isActive(workflow.actor)) return

  // Get the damage from the workflow
  const damage = workflow.healingAdjustedDamageTotal

  // Get the current damage from the actor
  const currentDamage = Number(workflow.actor.getFlag("ryan-premades", "damage")) || 0

  // Update the damage
  let newDamage = currentDamage
  if (damage > 0) {
    newDamage = currentDamage + damage
  }

  workflow.actor.setFlag("ryan-premades", "damage", newDamage)
  return newDamage
}

// Reset the damage
function resetDamage(actor) {
  actor.setFlag("ryan-premades", "damage", 0)
}

// Get the number of orbs from the damage
function getOrbs(damage) {
  return Math.floor(damage / 10)
}

async function damage(actor, numOrbs) {
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
  const healingAmount = 4 * numOrbs; // The amount of healing to apply
  const token = actor.getActiveTokens()[0]; // The token to apply the healing to

  // Apply the healing
  actor.update({
    "system.attributes.hp.value": Math.min(actor.system.attributes.hp.value + healingAmount, actor.system.attributes.hp.max)
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
          damage(actor, numOrbs);
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

function clearOrbs(actor) {
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
function updateOrbs(actor, numOrbs) {
  // Clear existing orbs
  clearOrbs(actor)

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
  // Track the damage from a roll
  Hooks.on("midi-qol.RollComplete", workflow => {
    // Check if the token is in combat
    const token = workflow.actor.getActiveTokens()[0]
    if (!token.inCombat) return

    const currentDamage = trackDamage(workflow)
    console.log("Current Damage: " + currentDamage)
    const numOrbs = getOrbs(currentDamage)
    console.log("Orbs: " + numOrbs)

    updateOrbs(workflow.actor, numOrbs)
  })

  Hooks.on("midi-qol.DamageRollComplete", workflow => {
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
    let currentTurn = turn.turn
    let previousTurn = turn.turn - 1

    const currentActor = combat.turns[currentTurn]?.actor
    const previousActor = previousTurn >= 0 ? combat.turns[previousTurn]?.actor : null

    // Check if the previous turn was the actor with the feat
    if (!previousActor || !isActive(previousActor || !playerOwnsActor(previousActor))) return

    // Get the damage from the actor and prompt the user
    const damage = previousActor.getFlag("ryan-premades", "damage") || 0
    const numOrbs = getOrbs(damage)
    promptUser(previousActor, numOrbs)

    // Reset the damage
    resetDamage(previousActor)
    clearOrbs(previousActor)
  })

  Hooks.on("combatRound", async (combat, turn) => {
    let currentTurn = turn.turn
    let previousTurn = combat.turns.length - 1

    const currentActor = combat.turns[currentTurn]?.actor
    const previousActor = previousTurn >= 0 ? combat.turns[previousTurn]?.actor : null

    // Check if the previous turn was the actor with the feat
    if (!previousActor || !isActive(previousActor || !playerOwnsActor(previousActor))) return

    // Get the damage from the actor and prompt the user
    const damage = previousActor.getFlag("ryan-premades", "damage") || 0
    const numOrbs = getOrbs(damage)
    promptUser(previousActor, numOrbs)

    // Reset the damage
    resetDamage(previousActor)
    clearOrbs(previousActor)
  })
}