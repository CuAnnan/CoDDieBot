const Discord = require('discord.js');
const client = new Discord.Client();
const conf = require('./conf.js');
const Bot = require('./CoDDiceBot.js');
let bot = null;

client.login(conf.clientToken);
client.once(
	'ready',
	function()
	{
		console.log("Logged in as "+client.user.username+"!");
		bot = new Bot(conf);
		
		bot.hoist(client).then(
			()=>{
				console.log('Hoisted bot');
			}
		);
	}
);

process.on(
	'SIGINT',
	function()
	{
		console.log('Shutting down bot')
		bot.shutdown().then(
			()=> {
				console.log('Shutting down client');
				client.destroy();
				console.log('Shutting down app');
				process.exit();
			}
		);

	}
);

process.on('unhandledRejection', console.error);
console.log('Starting');