// Prototype only: gives each new account a ready-made household to try out,
// with three pretend roommates (participants with no login), two chores, and a car.
// Every account gets its own copy, so testers never change each other's data.
import { addParticipant } from './participantService.js'
import { createResource, addResourceMembers } from './resourceService.js'
import { createRotation, updateRotation } from './rotationService.js'
import { loadActivities } from './activityService.js'

const DAY_MS = 24 * 60 * 60 * 1000
const inProgress = new Map() // stops the same account loading/seeding twice at once

function inDays(days)
{
    return new Date(Date.now() + days * DAY_MS).toISOString()
}

async function seed(me)
{
    const roommates = await Promise.all(['Alex Chen', 'Sam Rivera', 'Jordan Lee'].map(addParticipant))
    if (roommates.some(person => !person)) {
        return false
    }
    const [alex, sam, jordan] = roommates

    // The first person in each order has the current turn.
    const rotations = [
        { name: 'Take out the trash', description: 'Bins go to the curb Sunday night.', order: [me, alex, sam, jordan], every: [1, 'week'], dueIn: 1 },
        { name: 'Clean the bathroom', description: null, order: [sam, me, jordan], every: [2, 'week'], dueIn: 6 },
    ]

    await Promise.all(rotations.map(async plan => {
        const resource = await createResource(plan.name, plan.description, 'Rotation')
        if (!resource) return
        await addResourceMembers(resource.id, plan.order.map(person => person.id))
        const rotation = await createRotation(resource.id, ...plan.every)
        if (rotation) {
            await updateRotation(rotation.id, { next_rotation_at: inDays(plan.dueIn) })
        }
    }))

    // A reservation-style item, shown so testers see the second sharing method.
    const car = await createResource('Borrow the car', 'Honda Civic, parking spot 14.', 'Reservation')
    if (car) {
        await addResourceMembers(car.id, [me.id, alex.id, sam.id, jordan.id])
    }

    return true
}

// Loads the participant's activities. If they have none yet (a brand-new
// account), seeds the demo household first. Returns the activity list, or
// null if loading failed. Calls for the same participant share one run, so
// the demo data is never created twice.
function loadActivitiesWithDemo(me)
{
    if (!inProgress.has(me.id)) {
        const run = (async () => {
            const activities = await loadActivities(me.id)
            if (activities && activities.length === 0) {
                await seed(me)
                return loadActivities(me.id)
            }
            return activities
        })()
        inProgress.set(me.id, run.finally(() => inProgress.delete(me.id)))
    }
    return inProgress.get(me.id)
}

export { loadActivitiesWithDemo }
