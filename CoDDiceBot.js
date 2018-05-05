let DiscordBot = require('./DiscordBot'),
	{SimpleAction, AdvancedAction, ExtendedAction} = require('./DiceRoller'),
	conf = require('./conf');

class CoDDiceBot extends DiscordBot
{
	constructor()
	{
		super();
		this.stRoleOverrides = {};
	}
	
	processRoteAdvanced(commandParts)
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
	
	processCritExplode(commandParts)
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
	}
	
	preProcess(commandParts)
	{
		let tricks = this.processRoteAdvanced(commandParts),
			critAndExplode = this.processCritExplode(commandParts);
		
		return Object.assign({}, tricks, critAndExplode);
	}
	
	getSTRoleNameForGuild(guildId)
	{
		if(this.stRoleOverrides[guildId])
		{
			return this.stRoleOverrides;
		}
		return conf.stRoleName;
	}
	
	setSTRoleNameForGuild(commandParts, message)
	{
		if (!commandParts.length)
		{
			return;
		}
		let stRole = commandParts[0].trim();
		if (stRole.length > 1)
		{
			return;
		}
		if (stRole === conf.stRoleName)
		{
			delete this.stRoleOverrides[message.guild.id];
		}
		else
		{
			this.stRoleOverrides[message.guild.id] = stRole;
		}
	}
	
	getSettingsToSave()
	{
		let settingsToSave = super.getSettingsToSave();
		settingsToSave.stRoleOverrides = this.stRoleOverrides;
		return settingsToSave;
	}
	
	getSTList(message)
	{
		let role = message.guild.roles.find('name', this.getSTRoleNameForGuild(message.guild.id));
		
		if(role)
		{
			return role.members;
		}
		return [];
	}
	
	sendMessageArray(messageArray, message, comment)
	{
		let user = message.author,
			concatenatedMessagePart = [],
			concatenatedMessage = [],
			currentMessageLength = 0;
		
		for(let i in messageArray)
		{
			currentMessageLength += messageArray[i].length;
			if(currentMessageLength >= 1800)
			{
				currentMessageLength = 0;
				concatenatedMessage.push(concatenatedMessagePart);
				concatenatedMessagePart = [];
			}
			concatenatedMessagePart.push(messageArray[i]);
		}
		concatenatedMessage.push(concatenatedMessagePart);
		
		for(let i in concatenatedMessage)
		{
			let messageFragment = concatenatedMessage[i];
			
			user.createDM().then(
				(x)=>
				{
					x.send(messageFragment);
					
					
					let stList = this.getSTList(message);
					stList.forEach(
						(st, stId)=>
						{
							st.createDM().then(
								(y)=>{
									let stMessageFragment = messageFragment.slice(0);
									stMessageFragment.unshift(user.username+' rolled:');
									y.send(stMessageFragment);
									y.send(comment);
								}
							);
						}
					);
					
				}
			);
		}
	}
	
	displayResults(action, message, comment)
	{
		let results = action.getResults(),
			user = message.author;
		if(results.constructor === Array)
		{
			this.sendMessageArray(results, message, comment);
			return;
		}
		
		user.createDM().then(
			(x)=>
			{
				x.send(results);
				let stList = this.getSTList(message);
				stList.forEach(
					(st, stId)=> {
						st.createDM().then(
							(y)=>{
								y.send(user.username + ' rolled ' + results);
								y.send(comment);
							}
						);
					}
				);
			}
		);
	}
	
	simpleRoll(commandParts, message, comment)
	{
		let data = this.preProcess(commandParts),
			roll;
		
		data.pool = parseInt(commandParts[0]);
		if(commandParts.length == 2)
		{
			data.sitMods = parseInt(commandParts[1]);
		}
		
		if(data.advanced)
		{
			roll = new AdvancedAction(data);
		}
		else
		{
			roll = new SimpleAction(data);
		}
		this.displayResults(roll, message, comment);
	}
	
	extendedRoll(commandParts, message, comment)
	{
		let data = this.preProcess(commandParts);
		if(commandParts.length > 1)
		{
			data.pool = parseInt(commandParts[1]);
		}
		if(commandParts.length > 2)
		{
			data.sitMods = parseInt(commandParts[2]);
			if(commandParts.length > 3)
			{
				data.successThreshold = parseInt(commandParts[3]);
			}
		}
		
		let action = new ExtendedAction(data);
		this.displayResults(action, message);
	}
	
	async hoist(user)
	{
		super.hoist(user);
		this.attachCommands();
	}
	
	attachCommands()
	{
		super.attachCommands();
		this.attachCommand('help', this.displayHelpText);
		this.attachCommand('roll', this.simpleRoll);
		this.attachCommand('extended', this.extendedRoll);
	}
	
	displayHelpText(commandParts, message)
	{
		let prefix = this.commandPrefix;
		message.author.createDM().then(
			function(dm)
			{
				return dm.send([
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
					prefix+'extended [r a {explodeOn}+ {exceptionalOn}!] {pool} {sitmods} {target} -- A description of the roll\n',
					'\t*'+prefix+'extended 7* would roll 7 dice, 7 times, and require 10 successes',
					'\t*'+prefix+'extended 7 2* would roll 9 dice, 7 times, and require 10 successes',
					'\t*'+prefix+'extended 7 2 20* would roll 9 dice, 7 times and require 20 successes',
					'\t*'+prefix+'extended 7 0 20* would roll 7 dice, 7 times and require 20 successes',
				]);
			}
		);
	}
}

module.exports = new CoDDiceBot();