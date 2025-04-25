//async function playEffect(targets) {
    const targets = game.user.targets

    // Get the player token
    const token = game.actors.getName("Test").getActiveTokens()[0]

    // Loop through targets
    previousToken = token
    for (let target of targets) {
        // Get the distance between the tokens
        const distance = canvas.grid.measureDistance(previousToken, target)
        let duration = 1000

        // Calculate the duration based on the distance
        duration = duration * (1 + distance / 500)

        // Play the sequence
        new Sequence()
            .effect()
            .file('jb2a.shield_attack.ranged.throw.01.white.02')
            .atLocation(previousToken)
            .stretchTo(target)
            .startTime(400)
            .duration(duration)
            .play()

        // Delay for the animation duration
        await new Promise(r => setTimeout(r, duration - 400))
        previousToken = target
    }

    // Back to the player token
    // Get the distance between the tokens
    const distance = canvas.grid.measureDistance(previousToken, token)
    let duration = 1000

    // Calculate the duration based on the distance
    duration = duration * (1 + distance / 500)
    new Sequence()
        .effect()
        .file('jb2a.shield_attack.ranged.throw.01.white.02')
        .atLocation(previousToken)
        .stretchTo(token)
        .startTime(400)
        .duration(duration)
        .play()
//}

/*
export function use(workflow) {
    console.dir(workflow)
    // Get the targets
    const targets = game.user.targets

    // Play the effect
    playEffect(targets)
}
*/