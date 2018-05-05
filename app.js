const Discord = require('discord.js');
const client = new Discord.Client();
const conf = require('./conf.js');
const bot = require('./CoDDiceBot.js');

function listen()
{
	client.on(
		'message',
		function(message)
		{
			try
			{
				if (message.author.bot)
				{
					return;
				}
				bot.processCommand(message);
			}
			catch(e)
			{
				console.warn(e);
			}
		}
	);
}

client.login(conf.clientToken);
client.on(
	'ready',
	function()
	{
		console.log("Logged in as "+client.user.username+"!");
		
		bot.hoist(client.user).then(
			()=>{
				console.log('Hoisted bot');
				listen();
			}
		);
	}
);

process.on(
	'SIGINT',
	function()
	{
		console.log('Shutting down bot')
		bot.shutdown();
		console.log('Shutting down client');
		client.destroy();
		console.log('Shutting down app');
		process.exit();
	}
);

process.on('unhandledRejection', console.error);
console.log('Starting');