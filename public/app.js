document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-btn');
    const views = document.querySelectorAll('.view');
    const generateBtn = document.getElementById('generateBtn');
    const promptInput = document.getElementById('promptInput');
    const outputArea = document.getElementById('outputArea');
    const loader = document.getElementById('loader');
    const gameGrid = document.getElementById('gameGrid');
    const bridgeCode = document.getElementById('bridgeCode');

    // Bridge Script Template
    const serverUrl = window.location.origin;
    const bridgeScript = `-- [[ ROBLOX AI BRIDGE ]]
local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")

local SERVER_URL = "${serverUrl}"
local SYNC_INTERVAL = 10 -- seconds

local function syncWithAI()
    local success, result = pcall(function()
        return HttpService:PostAsync(
            SERVER_URL .. "/api/sync",
            HttpService:JSONEncode({
                gameId = game.GameId,
                serverId = game.JobId,
                playerCount = #game.Players:GetPlayers(),
                gameTime = math.floor(workspace.DistributedGameTime),
                data = {
                    placeId = game.PlaceId,
                    creatorId = game.CreatorId
                }
            }),
            Enum.HttpContentType.ApplicationJson
        )
    end)

    if success then
        local data = HttpService:JSONDecode(result)
        if data.command then
            print("AI Architect sent command:", data.command.action)
            -- Handle dynamic commands here
        end
    else
        warn("Failed to sync with AI Architect:", result)
    end
end

-- Start sync loop
task.spawn(function()
    while true do
        syncWithAI()
        task.wait(SYNC_INTERVAL)
    end
end)

print("✅ Roblox AI Bridge Active")`;

    bridgeCode.textContent = bridgeScript;

    // Tab Switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');
            
            tabs.forEach(t => t.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(target).classList.add('active');
            
            if (target === 'hub') startHubPolling();
            else stopHubPolling();
        });
    });

    // AI Generation
    generateBtn.addEventListener('click', async () => {
        const prompt = promptInput.value.trim();
        if (!prompt) return;

        generateBtn.disabled = true;
        loader.style.display = 'block';
        outputArea.innerHTML = '<span style="color: var(--primary);">Processing request...</span>';

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            const data = await response.json();
            if (data.output) {
                // Basic syntax highlighting/formatting (simplified)
                const formatted = data.output.replace(/```(lua)?\n([\s\S]*?)```/g, '<div class="code-block"><button class="copy-btn">Copy</button><pre><code>$2</code></pre></div>');
                outputArea.innerHTML = formatted;
                
                // Add copy functionality to new buttons
                document.querySelectorAll('.code-block .copy-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const code = btn.nextElementSibling.innerText;
                        navigator.clipboard.writeText(code);
                        btn.textContent = 'Copied!';
                        setTimeout(() => btn.textContent = 'Copy', 2000);
                    });
                });
            } else {
                outputArea.textContent = 'Error: ' + (data.error || 'Unknown error');
            }
        } catch (err) {
            outputArea.textContent = 'Connection failed: ' + err.message;
        } finally {
            generateBtn.disabled = false;
            loader.style.display = 'none';
        }
    });

    // Hub Polling
    let hubInterval = null;

    async function startHubPolling() {
        updateHub();
        hubInterval = setInterval(updateHub, 5000);
    }

    function stopHubPolling() {
        if (hubInterval) clearInterval(hubInterval);
    }

    async function updateHub() {
        try {
            const response = await fetch('/api/games');
            const instances = await response.json();
            
            if (instances.length === 0) {
                gameGrid.innerHTML = '<div class="game-card" style="opacity: 0.5; border-style: dashed;"><p style="text-align: center; margin: auto; color: var(--text-muted);">No active games connected.<br>Use the Bridge Script to link your Roblox project.</p></div>';
                return;
            }

            gameGrid.innerHTML = instances.map(game => `
                <div class="game-card">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h3 style="font-size: 1rem;">Game Instance</h3>
                            <p style="font-size: 0.7rem; color: var(--text-muted); font-family: monospace;">${game.serverId || 'local-studio'}</p>
                        </div>
                        <span class="status-badge status-online">Online</span>
                    </div>
                    <div class="game-stat">
                        <span>Players</span>
                        <span>${game.playerCount || 0} / 50</span>
                    </div>
                    <div class="game-stat">
                        <span>Uptime</span>
                        <span>${Math.floor(game.gameTime / 60)}m ${game.gameTime % 60}s</span>
                    </div>
                    <div class="game-stat">
                        <span>Place ID</span>
                        <span>${game.data?.placeId || 'N/A'}</span>
                    </div>
                    <button class="primary-btn" style="padding: 0.5rem; font-size: 0.8rem;" onclick="sendCommand('${game.gameId}')">
                        Push Command
                    </button>
                </div>
            `).join('');
        } catch (err) {
            console.error('Hub update failed:', err);
        }
    }

    window.sendCommand = async (gameId) => {
        const action = prompt("Enter command action (e.g., RESTART, MESSAGE, KICK):");
        if (!action) return;
        
        try {
            await fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId, action, payload: {} })
            });
            alert("Command queued for next sync!");
        } catch (err) {
            alert("Failed to send command.");
        }
    };
});
