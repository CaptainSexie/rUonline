const { Client, GatewayIntentBits, Events, SlashCommandBuilder, REST, Routes } = require('discord.js');

const CHANNEL_ID = '1351370100577538121';
const ROLE_NAME = 'Playing Ball';
const CHECK_INTERVAL = 300000; // 5 minutes in milliseconds

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.MessageContent
    ]
});

async function updateRole(member, shouldHaveRole) {
    let role = member.guild.roles.cache.find(r => r.name === ROLE_NAME);
    if (!role) {
        role = await member.guild.roles.create({ name: ROLE_NAME });
    }

    const hasRole = member.roles.cache.has(role.id);
    const logChannel = client.channels.cache.get(CHANNEL_ID);

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
    setInterval(checkAllMembers, CHECK_INTERVAL);
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

client.login('MTM1MTM2MzMyMTUwNDMzNzkyMA.G5blwT.dXhjK424xgPP23IusTkrgNw3poNhb3--0_bw-4').then(() => {
    deployCommands('1351363321504337920', '355895791451373578');
});
