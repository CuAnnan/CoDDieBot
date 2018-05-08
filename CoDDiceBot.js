let DiscordBot = require('./DiscordBot'),
	{SimpleAction, AdvancedAction, ExtendedAction} = require('./DiceRoller'),
	conf = require('./conf'),
	settingsToHoist = ['stRoleOverrides', 'serverWideOverridePreventDM', 'serverWideOverridesInChannelResponses', 'channelOverrides'];

class CoDDiceBot extends DiscordBot
{
	constructor()
	{
		super();
		this.stRoleOverrides = {};
		this.serverWideOverridePreventDM = {};
		this.serverWideOverridesInChannelResponses = {};
		this.channelOverrides = {};
	}
	
	async hoist(user)
	{
		let settings = super.hoist(user);
		
		for(let setting of settingsToHoist)
		{
			this[settings] = settings[setting]?settings[setting]:{};
		}
		
		this.attachCommands();
		return settings;
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
		this.elevateCommand(message);
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
	
	/**
	 * this allows the overriding of DM responses on a server wide basis
	 * if <i>ANYTHING</i> is sent along with the command, be it false or true or fuck my life,
	 * the serverwide respond by dm will be <b>PREVENTED</b>.
	 */
	setServerwideRespondByDM(commandParts, message)
	{
		this.elevateCommand(message);
		
		if(commandParts[0])
		{
			this.serverWideOverridePreventDM[message.guild.id] = true;
		}
		else
		{
			delete this.serverWideOverridePreventDM[message.guild.id];
		}
	}
	
	/**
	 * This allows the overriding of in channel responses on a server wide basis
	 * if there's no command parts or if there is and it's anything but "false" or "FALSE",
	 * the server wide respond in channel override will be set to true
	 */
	setServerwideRespondInChannel(commandParts, message)
	{
		this.elevateCommand(message);
		if(commandParts[0])
		{
			if(commandParts[0].toLowerCase() == "false")
			{
				delete this.serverWideOverridesInChannelResponses[message.guild.id];
				return;
			}
		}
		this.serverWideOverridesInChannelResponses[message.guild.id] = true;
	}
	
	getSettingsToSave()
	{
		let settingsToSave = super.getSettingsToSave();
		
		for(let setting of settingsToHoist)
		{
			settingsToSave[setting] = this[setting];
		}
		
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
	
	sendDMResults(userMessage, STMessage, message)
	{
		let user = message.author,
			stList = this.getSTList(message);
		
		user.createDM().then(
			(x)=>
			{
				x.send(userMessage);
				
				stList.forEach(
					(st, stId)=>
					{
						st.createDM().then(
							(y)=>{
								y.send(STMessage);
							}
						);
					}
				);
			}
		);
	}
	
	respondInChannel(userMessage, message)
	{
		message.reply([message.username,userMessage]);
	}
	
	sendMessageArray(messageArray, message, comment)
	{
		let user = message.author,
			cleanedMessage = this.cleanMessage(messageArray),
			stList = this.getSTList(message);
		
		for(let i in cleanedMessage)
		{
			let messageFragment = cleanedMessage[i],
				stMessageFragment = messageFragment.slice(0);
			stMessageFragment.unshift(user.username+" "+comment+" Roll:");
			
			if(!this.serverWideOverridePreventDM[message.guild.id])
			{
				this.sendDMResults(messageFragment, stMessageFragment, message);
			}
			if (this.serverWideOverridesInChannelResponses[message.guild.id])
			{
				this.respondInChannel(messageFragment, message);
			}
			else if(this.channelOverrides[message.channel.id])
			{
				this.respondInChannel(messageFragment, message);
			}
		}
	}
	
	sendOneLineMessage(results, message, comment)
	{
		if (!this.serverWideOverridePreventDM[message.guild.id])
		{
			this.sendDMResults(results, [(message.author.username + " " + comment + " Roll:"), results], message);
		}
		if (this.serverWideOverridesInChannelResponses[message.guild.id])
		{
			this.respondInChannel(results, message);
		}
		else if(this.channelOverrides[message.channel.id])
		{
			this.respondInChannel(results, message);
		}
	}
	
	displayResults(action, message, comment)
	{
		let results = action.getResults();
		
		if(results.constructor === Array)
		{
			this.sendMessageArray(results, message, comment);
			return;
		}
		
		this.sendOneLineMessage(results, message, comment);
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
	
	flagChannelForRolling(commandParts, message, comment)
	{
		if(commandParts[0] && (commandParts[0].toLowerCase() === 'false'))
		{
			delete this.channelOverrides[message.channel.id];
			return;
		}
		this.channelOverrides[message.channel.id] = true;
	}
	
	attachCommands()
	{
		super.attachCommands();
		this.attachCommand('help', this.displayHelpText);
		this.attachCommand('roll', this.simpleRoll);
		this.attachCommand('extended', this.extendedRoll);
		this.attachCommand('setSTRole', this.setSTRoleNameForGuild);
		this.attachCommand('setServerwideRespondInChannel', this.setServerwideRespondInChannel);
		this.attachCommand('setServerwideRespondByDM', this.setServerwideRespondByDM);
		this.attachCommand('allowRollsHere', this.flagChannelForRolling);
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
					'',
					'Admin Actions',
					'\t*'+prefix+'setCommandPrefix Specify a new command prefix',
					'\t*'+prefix+'setSTRole Specify a role other than the default Story-Teller for storyteller rolls',
					'The bot also responds to mentions in case mistakes are made. Admin actions can only be performed by the server owner.'
				]);
			}
		);
	}
}

module.exports = new CoDDiceBot();