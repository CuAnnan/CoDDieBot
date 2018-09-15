"use strict";
let conf = require('./conf.js'),
	fs = require('fs');

class DiscordBot
{
	constructor()
	{
		this.commands = {};
		this.commandPrefix = conf.commandPrefix;
		this.commandPrefixOverrides = {};
		this.deleteMessageOverrides = {};
	}
	
	async hoist(user)
	{
		this.user = user;
		let settings = this.getJSONFromFile('./settings.json');
		this.commandPrefixOverrides = settings.commandPrefixOverrides?settings.commandPrefixOverrides:{};
		this.deleteMessageOverrides = settings.deleteMessageOverrides?settings.deleteMessageOverrides:{};
		return settings;
	}
	
	getJSONFromFile(path)
	{
		let text = fs.readFileSync(path),
			json = JSON.parse(text);
		return json;
	}
	
	shutdown()
	{
		this.saveSettings();
	}
	
	elevateCommand(message)
	{
		if(message.guild.owner.id !== message.author.id)
		{
			throw new Error('This action is only allowable by the server owner');
		}
	}
	
	attachCommand(command, callback, rescope = true)
	{
		if(rescope)
		{
			callback = callback.bind(this);
		}
		
		this.commands[command.toLowerCase()] = callback;
	}
	
	attachCommands()
	{
		this.attachCommand('setCommandPrefix', this.setCommandPrefixForGuild);
		this.attachCommand('setCommandDelete', this.setDeleteMessages);
	}
	
	getDeleteMessageForGuild(guildId)
	{
		if(Object.keys(this.deleteMessageOverrides).indexOf(guildId) < 0)
		{
			return true;
		}
		return this.deleteMessageOverrides[guildId];
	}
	
	setDeleteMessages(commandParts, message, comment)
	{
		this.elevateCommand(message);
		if(!commandParts.length)
		{
			return;
		}
		let guildSpecificDeleteString = commandParts[0].trim().toLowerCase(),
			guildSpecificDeleteIndex = ['false', 'f', 'n', 'no'].indexOf(guildSpecificDeleteString),
			guildSpecificDelete = guildSpecificDeleteIndex < 0;
		this.deleteMessageOverrides[message.guild.id] = guildSpecificDelete;
	}
	
	getCommandPrefixForGuild(guildId)
	{
		if(this.commandPrefixOverrides[guildId])
		{
			return this.commandPrefixOverrides[guildId];
		}
		return this.commandPrefix;
	}
	
	setCommandPrefixForGuild(commandParts, message, comment)
	{
		this.elevateCommand(message);
		
		if (!commandParts.length)
		{
			return;
		}
		
		let guildSpecificPrefix = commandParts[0].trim();
		if (guildSpecificPrefix.length > 1)
		{
			return;
		}
		if (guildSpecificPrefix === conf.commandPrefix)
		{
			delete this.commandPrefixOverrides[message.guild.id];
		}
		else
		{
			this.commandPrefixOverrides[message.guild.id] = guildSpecificPrefix;
		}
		this.saveSettings();
	}
	
	getSettingsToSave()
	{
		let settingsToSave = {
				'commandPrefixOverrides': this.commandPrefixOverrides,
				'deleteMessages':this.deleteMessageOverrides,
			};
		return settingsToSave;
	}
	
	saveSettings()
	{
		let settings = this.getSettingsToSave();
		
		fs.writeFileSync('./settings.json', JSON.stringify(settings),(err)=>{
			if(err)
			{
				return console.warn(err);
			}
			console.log('The file was saved');
		});
		
	}
	
	addCommandAlias(commandAlias, command)
	{
		this.commands[commandAlias.toLowerCase()] = this.commands[command.toLowerCase()];
	}
	
	processCommand(message)
	{
		if(!message.guild)
		{
			return;
		}
		let prefix = this.getCommandPrefixForGuild(message.guild.id),
			atMention = `<@${this.user.id}>`,
			renamedAtMention = `<@!${this.user.id}>`;
		
		let isMention = message.content.startsWith(atMention);
		let isRenamedMention = message.content.startsWith(renamedAtMention);
		
		if (!(message.content.startsWith(prefix) || isMention || isRenamedMention))
		{
			return;
		}
		
		
		if (message.channel.type == 'dm')
		{
			message.channel.send("You cannot use this bot via DM yet for technical reasons");
			return;
		}
		
		let args;
		if(isMention)
		{
			args = message.content.replace(atMention, '').trim().split('--');
		}
		else if(isRenamedMention)
		{
			args = message.content.replace(renamedAtMention, '').trim().split('--');
		}
		else
		{
			args = message.content.substring(1).trim().split('--');
		}
		let comment = args[1] ? args[1].trim() : '',
			commandParts = args[0].split(' '),
			command = commandParts.shift().toLowerCase();
		
		this.executeCommand(command, commandParts, message, comment);
	}
	
	executeCommand(command, commandParts, message, comment)
	{
		if (this.commands[command])
		{
			try
			{
				this.commands[command](commandParts, message, comment);
			}
			catch(e)
			{
				message.reply('This is only allowable by the server owner');
				console.log(e);
			}
			
			if(this.getDeleteMessageForGuild(message.guild.id))
			{
				message.delete().catch(() => {
					console.log('Bot is not permitted to delete on this guild');
				});
			}
		}
	}
	
	sendDM(user, message)
	{
		user.createDM().then((x)=>{x.send(message);});
	}
	
	cleanMessage(message)
	{
		let concatenatedMessagePart = [],
			concatenatedMessage = [],
			currentMessageLength = 0;
		
		for(let i in message)
		{
			currentMessageLength += message[i].length;
			if(currentMessageLength >= 1800)
			{
				currentMessageLength = 0;
				concatenatedMessage.push(concatenatedMessagePart);
				concatenatedMessagePart = [];
			}
			concatenatedMessagePart.push(message[i]);
		}
		concatenatedMessage.push(concatenatedMessagePart);
		return concatenatedMessage;
	}
}

module.exports = DiscordBot;