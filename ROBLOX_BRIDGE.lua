-- [[ ROBLOX AI BRIDGE ]]
-- Place this script in ServerScriptService to connect to your AI Architect server.

local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")

-- CONFIGURATION
-- Replace this with your public server URL if hosting on Vercel/Render
local SERVER_URL = "http://localhost:3000" 
local SYNC_INTERVAL = 10 -- seconds between syncs

local function syncWithAI()
    local success, result = pcall(function()
        return HttpService:PostAsync(
            SERVER_URL .. "/api/sync",
            HttpService:JSONEncode({
                gameId = tostring(game.GameId),
                serverId = game.JobId ~= "" and game.JobId or "studio-instance",
                playerCount = #game.Players:GetPlayers(),
                gameTime = math.floor(workspace.DistributedGameTime),
                data = {
                    placeId = game.PlaceId,
                    creatorId = game.CreatorId,
                    isStudio = RunService:IsStudio()
                }
            }),
            Enum.HttpContentType.ApplicationJson
        )
    end)

    if success then
        local data = HttpService:JSONDecode(result)
        if data.command then
            print("🤖 AI Architect sent command:", data.command.action)
            
            -- Handle dynamic commands
            if data.command.action == "MESSAGE" then
                print("📢 BROADCAST:", data.command.payload.text)
            elseif data.command.action == "KICK_ALL" then
                for _, player in pairs(game.Players:GetPlayers()) do
                    player:Kick("Server maintenance via AI Architect")
                end
            end
        end
    else
        warn("⚠️ Failed to sync with AI Architect. Is the server running? Error:", result)
    end
end

-- Start sync loop
task.spawn(function()
    print("🚀 Initializing connection to AI Architect...")
    while true do
        syncWithAI()
        task.wait(SYNC_INTERVAL)
    end
end)

print("✅ Roblox AI Bridge Active")
