let DiceRoller = require ('./DiceRollActions.js'),
	Logger = require('./DiceLogger.js'),
	conf = require('./conf.js'),
	guilds = {};

function processRoteAdvanced (commandParts)
{
	let result = {
			rote:false,
			advanced:false
		},
		// these are the four ways we can match the two tricks
		roteIndex = commandParts.indexOf('r'),
		advancedIndex = commandParts.indexOf('a'),
		advancedRoteIndex = commandParts.indexOf('ra'),
		roteAdvancedIndex = commandParts.indexOf('ar');

	if(advancedRoteIndex >= 0)
	{
		commandParts.splice(advancedRoteIndex, 1);
		result.rote = true;
		result.advanced = true;
	}
	else if(roteAdvancedIndex >= 0)
	{
		commandParts.splice(roteAdvancedIndex, 1);
		result.rote = true;
		result.advanced = true;
	}
	if(advancedIndex >= 0)
	{
		commandParts.splice(advancedIndex, 1);
		result.advanced = true;
	}
	if(roteIndex >= 0)
	{
		commandParts.splice(roteIndex, 1);
		result.rote = true;
	}
	return result;
}

function processCritExplode(commandParts)
{
	let result = {
			explodesOn:10,
			exceptionalThreshold:5
		},
		indicesToSplice = [];

	for(let i in commandParts)
	{
		let commandPart = commandParts[i];
		if(commandPart.endsWith('+'))
		{
			result.explodesOn = parseInt(commandPart.substr(0, commandPart.length - 1));
			indicesToSplice.unshift(i);
		}
		else if(commandPart.endsWith('!'))
		{
			result.exceptionalThreshold = parseInt(commandPart.substr(0, commandPart.length - 1));
			indicesToSplice.unshift(i);
		}
	}
	
	for(let i = 0; i < indicesToSplice.length; i++)
	{
		commandParts.splice(indicesToSplice[i], 1);
	}
	return result;
};

function preProcess(commandParts)
{
	let tricks = processRoteAdvanced(commandParts),
		critAndExplode = processCritExplode(commandParts);
	return Object.assign({}, tricks, critAndExplode);
}

function sendArrayMessage(results, message)
{
	let user = message.author,
		concatenatedMessagePart = [],
		concatenatedMessage = [],
		currentMessageLength = 0;
	
	for(let i in results)
	{
		currentMessageLength += results[i].length;
		if(currentMessageLength >= 1800)
		{
			currentMessageLength = 0;
			concatenatedMessage.push(concatenatedMessagePart);
			concatenatedMessagePart = [];
		}
		concatenatedMessagePart.push(results[i]);
	}
	concatenatedMessage.push(concatenatedMessagePart);
	
	for(let i in concatenatedMessage)
	{
		let messageFragment = concatenatedMessage[i];
		console.log(messageFragment);
		user.createDM().then(
			function (x)
			{
				x.send(messageFragment);
				let stList = getSTList(message);
				for (var i in stList)
				{
					if (user.id !== i)
					{
						stList[i].createDM().then(
							function (y)
							{
								y.send(user.username + ' rolled ' + messageFragment);
							}
						);
					}
				}
			}
		);
	}
}


function displayResults(action, message)
{
	let results = action.getResults(),
		user = message.author,
		concattedMessages = [results];
	if(results.constructor === Array)
	{
		sendArrayMessage(results, message);
		return;
	}
	
	user.createDM().then(
		function (x)
		{
			x.send(results);
			let stList = getSTList(message);
			for (var i in stList)
			{
				if (user.id !== i)
				{
					stList[i].createDM().then(
						function (y)
						{
							y.send(user.username + ' rolled ' + results);
						}
					);
				}
			}
		}
	);
}

function getSTList(message)
{
	return guilds[message.guild.id].storytellers;
}

let prefix = '!';

/**
 * Help text stuff
 */
let commands = {
	'simple':'Perform a simple action',
	's':'Alias for "simple"',
	'roll':'Alias for "simple"',
	'extended':'Perform an extended action',
	'ex':'Alias for "extended"',
	'examples':'See some example rolls',
	'samples':'Alias for "examples"',
	'help':'This text'
};
let helpText =
	'Commands:';
let longest = '';
for(let i in commands)
{
	longest = longest.length > i.length ? longest : i;
}
for(let i in commands)
{
	let padding = '   ';
	let padLength = Math.max(0, longest.length - i.length);
	for(let j = 0; j < padLength; j++)
	{
		padding += ' ';
	}
	helpText += '\n\t'+prefix+i+':'+padding+commands[i];
}

let rollerBot = {};

rollerBot.help = function(commandParts, message)
{
	let user = message.author;
	
	user.createDM().then(
		function(x)
		{
			x.send(helpText);
		}
	);
};

rollerBot.simple = rollerBot.s = rollerBot.roll = function(commandParts, message, comment)
{
	let data = preProcess(commandParts);
	if(!commandParts.length)
	{
		return;
	}
	data.pool = parseInt(commandParts[1]);
	if(commandParts.length == 3)
	{
		data.sitMods = parseInt(commandParts[2]);
	}
	let action;
	if(data.advanced)
	{
		roll = new DiceRoller.AdvancedAction(data);
	}
	else
	{
		roll = new DiceRoller.SimpleAction(data);
	}
	displayResults(roll, message);
};

rollerBot.extended = rollerBot.ex = function(commandParts, message, comment)
{
	let data = preProcess(commandParts);
	if(commandParts.length > 1)
	{
		data.pool = parseInt(commandParts[1]);
	}
	if(commandParts.length > 2)
	{
		data.sitMods = parseInt(commandParts[2]);
	}
	let action = new DiceRoller.ExtendedAction(data);
	displayResults(action, message);
};

rollerBot.examples = rollerBot.samples = rollerBot.sample = rollerBot.example = function(commandParts, message)
{
	message.author.createDM().then(
		function(x)
		{
			x.send([
				'Unless overridden, the roller rerolls on 10s and considers 5 successes exceptional',
				'',
				'Simple actions:',
				'Command format:',
				prefix+'roll [r a {explodeOn}+ {exceptionalOn}!] {pool} {sitmods} -- A description of the roll\n',
				'\t*'+prefix+'roll 7* would roll 7 dice',
				'\t*'+prefix+'roll 7 2* would roll 9 dice, treating two of them as a bonus',
				'\t*'+prefix+'roll 7 -2* would roll 5 dice, treating two of them as a penalty',
				'\t*'+prefix+'roll 9+ 5* would roll 5 dice, rerolling all 9s and 10s',
				'\t*'+prefix+'roll 3! 6* would roll 6 dice, and would count 3 or more successes as exceptional',
				'\t*'+prefix+'roll 8+ 4! 9* would roll 9 dice, rerolling on 8s, 9s or 10s and count 4 or more successes as exceptional',
				'\t*'+prefix+'roll r 6* would roll 6 dice, with the rote action',
				'\t*'+prefix+'roll a 8* would roll 8 dice, with the advanced action',
				'',
				'Extended Actions: ',
				'Extended actions require {target} successes, 10 by default, over their {pool} rolls with {pool} + {sitmods} dice rolled each time',
				'Extended actions can be rote, advanced, rote advanced, and handle explosions and exceptional successes as simple actions',
				'Command format:',
				prefix+'extended [r a {explodeOn}+ {exceptionalOn}!] {pool} {sitmods} {target}\n',
				'\t*'+prefix+'extended 7* would roll 7 dice, 7 times, and require 10 successes',
				'\t*'+prefix+'extended 7 2* would roll 9 dice, 7 times, and require 10 successes',
				'\t*'+prefix+'extended 7 2 20* would roll 9 dice, 7 times and require 20 successes',
				'\t*'+prefix+'extended 7 0 20* would roll 7 dice, 7 times and require 20 successes',
				'\n\n',
				'Any text after the -- is treated as a comment or descriptor for the roll only and has no mechanical effect'
			]);
		}
	);
};

rollerBot.register = function(commandParts, message)
{
	console.log(message);
};

rollerBot.process = function(message)
{
	if(!message.content.startsWith(prefix))
	{
		return;
	}
	if(message.channel.type == 'dm')
	{
		message.channel.send("You cannot use this bot via DM yet for technical reasons");
		return;
	}

	let args = message.content.substring(1).split('--'),
		comment = args[1]?args[1].trim():'', commandParts = args[0].toLowerCase().split(' '),
		command = message.content.substring(1).split(' ')[0],
		commandsToIgnore = ['process'];

	if(commandsToIgnore.indexOf(command) < 0 && this[command])
	{
		this[command](commandParts, message, comment);
	}
};

rollerBot.registerSTList = function(client)
{
	client.guilds.map(
		x=>{
			guilds[x.id] = {name:x.name, storytellers:{}};
			let stRole = x.roles.find('name', conf.storyTellerRoleName);
			x.members.map(
				y=>{
					if(y.roles.has(stRole.id))
					{
						guilds[x.id].storytellers[y.id] = y;
					}
				}
			);
		}
	);
};

module.exports = rollerBot;