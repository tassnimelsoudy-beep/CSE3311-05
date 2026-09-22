import {createResource, getResources, addResourceMember, getResourcesForUser} from '../services/resourceService.js'
import {addParticipant, getParticipants} from '../services/participantService.js'
import {createRotation, getRotation} from '../services/rotationService.js'
import {advanceIfDue} from '../services/rotationService.js'
 // testing the resource and participant services. can be deleted

    export async function test() {
        const testResource = await createResource("Test Resource", "This is a test resource", "rotation")
        resource
        const testParticipant = await addParticipant("Test Participant1")
        const testPerson2 = await addParticipant("Test Participant2")

        await addResourceMember(testResource.id, testParticipant.id, "owner", 1)
        await addResourceMember(testResource.id, testPerson2.id, "member", 2)
        const testRotation = await createRotation(testResource.id, 2, "minute")

        const resources = await getResources()
        const participants = await getParticipants(testResource.id)
        const userResources = await getResourcesForUser(testParticipant.id)
        const rotation = await getRotation(testRotation.resource_id)

        //advanceIfDue("76893a77-defd-4cf3-bbd6-91199f9edbe8")

        console.log(testResource)
        console.log("Resources: ", resources)
        console.log("Participants: ", participants)
        console.log("User Resources: ", userResources)
        console.log("rotation resources", rotation)
    }

  