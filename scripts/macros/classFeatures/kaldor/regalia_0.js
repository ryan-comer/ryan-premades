import {
    playerOwnsActor
} from "../../../utils/players.js"

const feat = {
    "name": "Kaldor Regalia 0",
    "type": "feat",
}

// Check if the feat is active on the actor
function isActive(actor) {
  return actor.items.some(item => item.name === feat.name)
}

async function getNewTempHealth(actor) {
    // Get the current paladin levels for tha actor
    const paladinLevels = actor.items.filter(item => item.type === "class" && item.name === "Paladin")[0].system.levels

    // Calculate the temp health (1d6 + paladin levels)
    const roll = await new Roll("1d6").roll()
    console.log(`Rolled: ${roll.total} + Paladin Levels: ${paladinLevels} = ${roll.total + paladinLevels}`)
    return roll.total + paladinLevels
}

async function setTempHealth(actor) {
    const token = actor.getActiveTokens()[0]
    const newTempHealth = await getNewTempHealth(actor)
    actor.update({
        "system.attributes.hp.temp": newTempHealth
    })

    new Sequence()
        .effect()
        .file('jb2a.template_circle.aura.01.complete')
        .attachTo(token.id)
        .scale(0.5)
        .fadeIn(500)
        .fadeOut(500)
        .play();
}

export function init() {
    Hooks.on("combatTurn", async (combat, turn) => {
        let previousTurn = turn.turn - 1
        const previousActor = previousTurn >= 0 ? combat.turns[previousTurn]?.actor : null

        // Check if the previous turn was the actor with the feat
        if (!previousActor || !isActive(previousActor || !playerOwnsActor(previousActor))) return

        // Prompt the user if they want to use the feat
        await Dialog.confirm({
            title: "Night's Kiss",
            content: `Do you want to use Night's Kiss?`,
            yes: () => setTempHealth(previousActor),
            no: null
        })
    })

    Hooks.on("combatRound", async (combat, turn) => {
        let previousTurn = turn.turn - 1
        const previousActor = previousTurn >= 0 ? combat.turns[previousTurn]?.actor : null

        // Check if the previous turn was the actor with the feat
        if (!previousActor || !isActive(previousActor || !playerOwnsActor(previousActor))) return

        // Prompt the user if they want to use the feat
        await Dialog.confirm({
            title: "Night's Kiss",
            content: `Do you want to use Night's Kiss?`,
            yes: () => setTempHealth(previousActor),
            no: null
        })
    })

}