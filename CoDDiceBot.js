let DiscordBot = require('extensiblediscordbot'),
	{SimpleAction, AdvancedAction, ExtendedAction} = require('./DiceRoller'),
	settingsToHoist = ['stRoleOverrides', 'serverWideOverridePreventDM', 'serverWideOverridesInChannelResponses', 'channelOverrides'];

class CoDDiceBot extends DiscordBot
{
	constructor(conf)
	{
		super(conf);
		this.defaultSTRoleName = conf.defaultSTRoleName;
		this.stRoleOverrides = {};
		this.serverWideOverridePreventDM = {};
		this.serverWideOverridesInChannelResponses = {};
		this.channelOverrides = {};
	}
	
	async hoist(client)
	{
		let settings = await super.hoist(client);

		for(let setting of settingsToHoist)
		{
			this[setting] = settings[setting]?settings[setting]:{};
		}

		this.attachCommands();
		return settings;
	}

	getSimpleAction(data)
	{
		return new SimpleAction(data);
	}

	getAdvancedAction(data)
	{
		return new AdvancedAction(data);
	}

	getExtendedAction(data)
	{
		return new ExtendedAction(data);
	}

	processRoteAdvanced(message)
	{
	    let result = {
				rote:false,
				advanced:false
			},
			// these are the four ways we can match the two tricks
            rote = message.content.match(/rote/),
			advanced = message.content.match(/advance/);

	    if(rote)
        {
            result.rote = true;
        }
	    if(advanced)
        {
            result.advanced = true;
        }

		return result;
	}

	processCritExplode(message)
	{
		let data = {
				explodesOn:10,
				exceptionalThreshold:5
			},
			explode = message.content.match(/(\d+)-a/),
			exceptional = message.content.match(/(\d)-e/);
		if(explode && explode.length >= 1)
		{
			data.explodesOn = parseInt(explode[1]);
		};
		if(exceptional && exceptional.length >= 1)
		{
			data.exceptionalThreshold = parseInt(exceptional[1]);
		}

		return data;
	}

	processPoolAndSitMods(commandParts)
	{
		let data = {pool:0, sitMods:0};
		let poolSearch = true;
		for(let commandPart of commandParts)
		{
			if(!isNaN(commandPart))
			{
				if(poolSearch)
				{
					poolSearch = false;
					data.pool = parseInt(commandPart);
				}
				else
				{
					data.sitMods += parseInt(commandPart);
				}
			}
		}
		return data;

	}
	
	preProcess(commandParts, message)
	{
		let tricks = this.processRoteAdvanced(message),
			critAndExplode = this.processCritExplode(message),
			pool = this.processPoolAndSitMods(commandParts);

		let data = Object.assign({}, tricks, critAndExplode, pool);
		return data;
	}
	
	getSTRoleNameForGuild(guildId)
	{
		if(this.stRoleOverrides[guildId])
		{
			return this.stRoleOverrides[guildId];
		}
		return this.defaultSTRoleName;
	}
	
	setSTRoleNameForGuild(commandParts, message)
	{
		this.elevateCommand(message);
		if (!commandParts.length)
		{
			return;
		}
		let stRole = commandParts[0].trim();
		if (stRole.length < 1)
		{
			return;
		}
		if (stRole === this.defaultSTRoleName)
		{
			delete this.stRoleOverrides[message.guild.id];
		}
		else
		{
			this.stRoleOverrides[message.guild.id] = stRole;
		}
	}
	
	/**
	 * This allows the overriding of in channel responses on a server wide basis
	 * if there's no command parts or if there is and it's anything but "false" or "FALSE",
	 * the server wide respond in channel override will be set to true
	 */
	setServerwideRespondByDM(commandParts, message)
	{
		this.elevateCommand(message);
		
		if(commandParts[0] && (commandParts[0].toLowerCase() == "false"))
		{
			this.serverWideOverridePreventDM[message.guild.id] = true;
			return;
		}
		delete this.serverWideOverridePreventDM[message.guild.id];
		return true;
	}
	
	/**
	 * This allows the overriding of in channel responses on a server wide basis
	 * if there's no command parts or if there is and it's anything but "false" or "FALSE",
	 * the server wide respond in channel override will be set to true
	 */
	setServerwideRespondInChannel(commandParts, message)
	{
		this.elevateCommand(message);
		if(commandParts[0] && (commandParts[0].toLowerCase() == "false"))
		{
			delete this.serverWideOverridesInChannelResponses[message.guild.id];
			return;
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
		let stRole = this.getSTRoleNameForGuild(message.guild.id);
		if(!stRole)
		{
			return [];
		}
		let role = message.guild.roles.find('name', stRole);
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
						if(st.user != user)
						{
							st.createDM().then(
								(y) => {
									y.send(STMessage);
								}
							);
						}
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
			cleanedMessage = this.cleanMessage(messageArray);
		
		for(let i in cleanedMessage)
		{
			let messageFragment = cleanedMessage[i],
				stMessageFragment = messageFragment.slice(0);
			stMessageFragment.unshift(user.username+" "+comment+" Roll:");
			
			if(!this.serverWideOverridePreventDM[message.guild.id])
			{
				this.sendDMResults(messageFragment, stMessageFragment, message);
			}
			if (this.serverWideOverridesInChannelResponses[message.guild.id] || this.channelOverrides[message.channel.id])
			{
				this.respondInChannel(messageFragment.join('\n'), message);
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
		let data = this.preProcess(commandParts, message),
			roll;
		
		if(data.advanced)
		{
			roll = this.getAdvancedAction(data);
		}
		else
		{
			roll = this.getSimpleAction(data);
		}
		this.displayResults(roll, message, comment);
	}
	
	extendedRoll(commandParts, message, comment)
	{
		let data = this.preProcess(commandParts, message);
		if(commandParts.length)
		{
			data.pool = parseInt(commandParts[0]);
		}
		if(commandParts.length >= 2)
		{
			data.sitMods = parseInt(commandParts[1]);
			if(commandParts.length > 2)
			{
				data.successThreshold = parseInt(commandParts[2]);
			}
		}
		
		let action = this.getExtendedAction(data);
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
	
	async displayHelpText(commandParts, message)
	{
		let prefix = this.commandPrefix;
		return message.author.createDM().then(
			function(dm)
			{
				return dm.send([
					'Unless overridden, the roller rerolls on 10s and considers 5 successes exceptional',
					'',
					'Simple actions:',
					'Command format:',
					prefix+'roll [rote advanced {8|9|10}-again {exceptionalOn}-exceptional] {pool} {sitmods} -- A description of the roll\n',
					'\t*'+prefix+'roll 7* would roll 7 dice',
					'\t*'+prefix+'roll 7 2* would roll 9 dice, treating two of them as a bonus',
					'\t*'+prefix+'roll 7 -2* would roll 5 dice, treating the minus two as a penalty',
					'\t*'+prefix+'roll 9-again 5* would roll 5 dice, rerolling all 9s and 10s',
					'\t*'+prefix+'roll 3-exceptional 6* would roll 6 dice, and would count 3 or more successes as exceptional',
					'\t*'+prefix+'roll 8-again 4-exceptional 9* would roll 9 dice, rerolling on 8s, 9s or 10s and count 4 or more successes as exceptional',
					'\t*'+prefix+'roll rote 6* would roll 6 dice, with the rote action',
					'\t*'+prefix+'roll advanced 8* would roll 8 dice, with the advanced action',
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
					'The bot also responds to mentions.',
					'See the github, page https://github.com/CuAnnan/CoDDieBot, for configuration options'
				]);
			}
		);
	}
}

module.exports = CoDDiceBot;