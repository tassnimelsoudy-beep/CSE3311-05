async function addParticipant(userName)
{
    try {
            if (userName == null || !userName.trim()) {
                console.error("name cannot be empty")
                return null
            }
             const {data, error } = await supabase
            .from("participants")
            .insert({
                name: userName, 
            })
            .select()
    
            if (error) {
                throw error
            }
    
            console.log("successfully created: ", data)
            return data
    } catch (error)
    {
        console.error("Error inserting data: ", error.message)
        return null
    }
}