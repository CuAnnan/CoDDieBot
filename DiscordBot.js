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
	}
	
	hoist(user)
	{
		this.user = user;
	}
	
	shutdown()
	{
		this.saveSettings();
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
	}
	
	getSettingsToSave()
	{
		let settingsToSave = {
				'commandPrefixOverrides': this.commandPrefixOverrides
			};
		return settingsToSave;
	}
	
	saveSettings()
	{
		let settings = this.getSettingsToSave();
		console.log('Trying to write file');
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
			atMention = `<@${this.user.id}>`;
		
		let isMention = message.content.startsWith(atMention);
		
		
		if (!(message.content.startsWith(prefix) || isMention))
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
		else
		{
			args = message.content.substring(1).trim().split('--');
		}
		
		
		let comment = args[1] ? args[1].trim() : '',
			commandParts = args[0].split(' '),
			command = commandParts.shift().toLowerCase();
		
		if (this.commands[command])
		{
			this.commands[command](commandParts, message, comment);
			message.delete();
		}
	}
	
	sendDM(user, message)
	{
		user.createDM().then((x)=>{x.send(message);});
	}
}

module.exports = DiscordBot;