# README #

### Discord CoD die rolling bot ###

With support for extended and simple rolling, and advanced, rote, exploding dice and specified number of successes for exceptional.


### How do I get set up? ###

* git clone the repository
* _npm install_ from the root of the folder
* follow [these steps](https://github.com/reactiflux/discord-irc/wiki/Creating-a-discord-bot-&-getting-a-token) to create a bot account on your server
* create a storyteller role on your account to receive roll notifications
* Change the conf.js in the root folder to match the storyteller role and the bot key
* _node dieBotClient.js_ or tell your preferred node loader to boot it on your server's launch

### That seems like a lot of work ###

You can always use the bot I have running on my server. If your usage starts to impact my usage, though, I may kick you off it.

https://discordapp.com/api/oauth2/authorize?client_id=442098307150381077&permissions=75776&scope=bot


### Configuring the bot in room ###

The bot has configurable behaviours for responding to requests for rolls. The default behaviour is to respond by DM to the person who requests the roll and to any one with the storyteller role (which is also configurable).
But all of these configurations can only be performed by the server owner (I may add a role for this at a later date, but I have other projects on the go at present).

* `setSTRole {rolename}` configures the role for storytellers
* `setServerwideRespondInChannel [true|false]` configures the bot to respond to the channel that it was invoke in
* `setServerwideRespondByDM [true|false]` configures the bot to respond by DM to the person who asked for the roll and the members of the role defined by `setSTRole`
* `allowRollsHere [true|false]` allows you to blacklist rooms from responding to roles. The message will still be deleted but it will not be replied to.