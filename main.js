const { Client, GatewayIntentBits, Events, SlashCommandBuilder, REST, Routes } = require('discord.js');
const config = require('./config.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.MessageContent
    ]
});

async function updateRole(member, shouldHaveRole) {
    let role = member.guild.roles.cache.find(r => r.name === config.roleName);
    if (!role) {
        role = await member.guild.roles.create({ name: config.roleName });
    }

    const hasRole = member.roles.cache.has(role.id);
    const logChannel = client.channels.cache.get(config.channelId);

    if (shouldHaveRole && !hasRole) {
        await member.roles.add(role);
        await logChannel.send(`"${member.user.username}": Online`);
    } else if (!shouldHaveRole && hasRole) {
        await member.roles.remove(role);
        await logChannel.send(`"${member.user.username}": Offline`);
    }
}

function isPlayingRocketLeague(member) {
    return member.presence?.activities?.some(activity => 
        activity.type === 0 && activity.name.toLowerCase() === 'rocket league'
    ) || false;
}

client.once(Events.ClientReady, () => {
    console.log(`Bot is ready! Logged in as ${client.user.tag}`);
    checkAllMembers();
    setInterval(checkAllMembers, config.checkInterval);
});

client.on(Events.PresenceUpdate, async (oldPresence, newPresence) => {
    const wasPlaying = oldPresence ? isPlayingRocketLeague(oldPresence.member) : false;
    const isPlaying = isPlayingRocketLeague(newPresence.member);
    
    if (wasPlaying !== isPlaying) {
        await updateRole(newPresence.member, isPlaying);
    }
});

async function checkAllMembers() {
    for (const guild of client.guilds.cache.values()) {
        const members = await guild.members.fetch();
        for (const member of members.values()) {
            if (!member.user.bot) {
                const shouldHaveRole = isPlayingRocketLeague(member);
                await updateRole(member, shouldHaveRole);
            }
        }
    }
}

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'scan') {
        await interaction.reply('Starting user scan...');
        await checkAllMembers();
        await interaction.followUp('Scan complete!');
    }
});

async function deployCommands(clientId, guildId) {
    const rest = new REST().setToken(client.token);
    const commands = [
        new SlashCommandBuilder()
            .setName('scan')
            .setDescription('Scan all users for Rocket League status')
    ];

    try {
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );
        console.log('Slash commands registered');
    } catch (error) {
        console.error(error);
    }
}

client.login(config.token).then(() => {
    deployCommands(config.clientId, config.guildId);
});
