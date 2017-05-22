const Discord = require('discord.js');
const client = new Discord.Client();
const bot = require('./RollerBot.js');
const conf = require('./conf.js');

client.login(conf.clientToken);
client.on(
	'ready',
	function()
	{
		console.log("Logged in as "+client.user.username+"!");
		bot.registerGuildList(client);
	}
);

client.on(
	'message',
	function(message)
	{
		if(message.author.bot)
		{
			return;
		}
		bot.process(message);
	}
);

console.log('Starting');

process.on(
	'SIGINT',
	function()
	{
		console.log('Shutting down bot');
		client.destroy();
		console.log('Shutting down app');
		process.exit();
	}
);