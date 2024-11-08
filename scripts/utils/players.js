export function playerOwnsActor(actor) {
    return actor.testUserPermission(game.user, "OWNER")
}