SELECT 
    id, 
    name, 
    SUBSTRING(greetingMessage, 1, 30) as greeting,
    queueId,
    chatbotId,
    isAgent
FROM Chatbots 
WHERE queueId = 2 OR chatbotId IN (SELECT id FROM Chatbots WHERE queueId = 2)
ORDER BY queueId DESC, chatbotId, id;
