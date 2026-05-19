require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const DISCORD_AT_HILAB_ROLE_ID = process.env.DISCORD_AT_HILAB_ROLE_ID;
const DISCORD_AT_HILAB_ROLE_NAME = process.env.DISCORD_AT_HILAB_ROLE_NAME || 'at HILab';
const SCANS_PER_WINDOW = Number(process.env.SCANS_PER_WINDOW) || 6;

let discordAtHilabRoleIdResolved = DISCORD_AT_HILAB_ROLE_ID || null;
/** @type {Client | null} */
let discordClient = null;

function isDiscordRoleSyncEnabled() {
    return Boolean(
        discordClient?.isReady() &&
        DISCORD_GUILD_ID &&
        discordAtHilabRoleIdResolved
    );
}

function getDiscordMeta() {
    return {
        discordRoleSync: isDiscordRoleSyncEnabled(),
        atHilabRoleId: discordAtHilabRoleIdResolved,
        atHilabRoleName: DISCORD_AT_HILAB_ROLE_NAME
    };
}

function logDiscordRoleDebugInfo(guild, member, targetRole) {
    const botMember = guild.members.me;
    if (!botMember) {
        console.error('Discord debug: bot member object not available');
        return;
    }

    const botTopRole = botMember.roles.highest;
    const memberTopRole = member?.roles.highest;

    console.log('Discord debug: bot id', botMember.id);
    console.log('Discord debug: bot top role', botTopRole?.name, botTopRole?.id, 'position', botTopRole?.position);
    console.log('Discord debug: target role', targetRole?.name, targetRole?.id, 'position', targetRole?.position);
    console.log('Discord debug: member id', member?.id, 'top role', memberTopRole?.name, memberTopRole?.id, 'position', memberTopRole?.position);
    console.log('Discord debug: bot permissions', botMember.permissions.toArray().join(', '));
}

async function syncDiscordRolesFromLanPresence(userRegistry, presenceHistory, isUserPresent, normalizeDiscordId) {
    const guild = discordClient?.guilds.cache.get(DISCORD_GUILD_ID);
    if (!guild || !discordAtHilabRoleIdResolved) {
        if (!guild) {
            console.error('Discord: guild not available in cache; role sync skipped');
        }
        if (!discordAtHilabRoleIdResolved) {
            console.error('Discord: at HILab role ID not resolved; role sync skipped');
        }
        return;
    }

    const role = guild.roles.cache.get(discordAtHilabRoleIdResolved);
    if (!role) {
        console.error(`Discord: at HILab role not found in guild ${DISCORD_GUILD_ID} with id ${discordAtHilabRoleIdResolved}`);
        return;
    }

    for (const user of userRegistry) {
        const discordId = normalizeDiscordId(user.discordId);
        if (!discordId) {
            continue;
        }

        const mac = user.mac.toLowerCase();
        const history = presenceHistory.get(mac) || [];
        const lanPresent = isUserPresent(mac);
        const confidentAbsent = history.length >= SCANS_PER_WINDOW && !lanPresent;

        try {
            const member = await guild.members.fetch({ user: discordId, force: false }).catch((err) => {
                console.error(`Discord: member fetch failed for ${user.name} (${discordId}):`, err?.message || err);
                return null;
            });
            if (!member) {
                console.error(`Discord: member not found for ${user.name} (${discordId}); skipping role sync`);
                continue;
            }

            const hasRole = member.roles.cache.has(discordAtHilabRoleIdResolved);

            if (lanPresent && !hasRole) {
                console.log(`Discord: adding role ${discordAtHilabRoleIdResolved} to ${user.name} (${discordId})`);
                logDiscordRoleDebugInfo(guild, member, role);
                await member.roles.add(role, 'LAN presence: in lab');
            } else if (confidentAbsent && hasRole) {
                console.log(`Discord: removing role ${discordAtHilabRoleIdResolved} from ${user.name} (${discordId})`);
                logDiscordRoleDebugInfo(guild, member, role);
                await member.roles.remove(role, 'LAN presence: left lab');
            } else if (lanPresent && hasRole) {
                console.log(`Discord: member already has at HILab role: ${user.name} (${discordId})`);
            } else if (confidentAbsent && !hasRole) {
                console.log(`Discord: member already lacks at HILab role: ${user.name} (${discordId})`);
            }
        } catch (error) {
            console.error(`Discord: role sync failed for ${user.name}:`, error?.message || error);
            if (error?.message && String(error.message).includes('Missing Permissions')) {
                logDiscordRoleDebugInfo(guild, await guild.members.fetch({ user: discordId, force: true }), role);
            }
        }
    }
}

function startDiscordPresenceBot(initialSyncCallback) {
    if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
        console.log('Discord at HILab mirror: off (set DISCORD_BOT_TOKEN + DISCORD_GUILD_ID + role id or name)');
        return;
    }

    discordClient = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    });

    discordClient.once('ready', async () => {
        const guild = discordClient.guilds.cache.get(DISCORD_GUILD_ID);
        if (!guild) {
            console.error('Discord: guild not found (check DISCORD_GUILD_ID)');
            return;
        }

        if (!discordAtHilabRoleIdResolved) {
            const byName = guild.roles.cache.find((r) => r.name === DISCORD_AT_HILAB_ROLE_NAME);
            if (byName) {
                discordAtHilabRoleIdResolved = byName.id;
            } else {
                console.error(`Discord: role "${DISCORD_AT_HILAB_ROLE_NAME}" not found; set DISCORD_AT_HILAB_ROLE_ID`);
                return;
            }
        }

        const configuredRole = guild.roles.cache.get(discordAtHilabRoleIdResolved);
        if (!configuredRole) {
            console.error(`Discord: configured at HILab role ID ${discordAtHilabRoleIdResolved} does not exist in guild ${DISCORD_GUILD_ID}`);
            return;
        }

        console.log(`Discord: connected to guild ${guild.name} (${DISCORD_GUILD_ID}), at HILab role id ${discordAtHilabRoleIdResolved}`);
        logDiscordRoleDebugInfo(guild, guild.members.me, configuredRole);

        if (typeof initialSyncCallback === 'function') {
            try {
                await initialSyncCallback();
            } catch (error) {
                console.error('Discord: initial role mirror failed', error);
            }
        }
    });

    discordClient.login(DISCORD_BOT_TOKEN).catch((error) => {
        console.error('Discord: login failed', error);
    });
}

module.exports = {
    startDiscordPresenceBot,
    syncDiscordRolesFromLanPresence,
    isDiscordRoleSyncEnabled,
    getDiscordMeta,
};
