var MongoClient = require('mongodb').MongoClient,
	conf = {
		collections:{
			room:'roomLogs',
			rolls:'dieRolls'
		},
		url:'mongodb://logging_user_dba:||74;nature;RETURN;island;06||@ds033076.mlab.com:33076/dierollinglogs'
	};

function DiceLogger(data)
{
	this.roomId = data.channel + '__' +Date.now();
	this.channel = data.channel;
	this.user = data.user;
	this.comment = data.comment;
	this.createLogCollectionEntry();
	this.rolls = [];
}

DiceLogger.prototype.addToMongo = function(collectionName, data)
{
	MongoClient.connect(
		conf.url,
		function(err, db)
		{
			if(!err)
			{
				var collection = db.collection(collectionName);
				collection.insertOne(data);
				db.close();
			}
		}
	);
}

DiceLogger.prototype.createLogCollectionEntry = function()
{
	var roomData = {
		'roomId':this.roomId,
		'user':this.user,
		'comment':this.comment,
		'channel':this.channel
	};
	this.addToMongo(conf.collections.room, roomData);
};

DiceLogger.prototype.log = function(action)
{
	var data = {roomId:this.roomId, action:action};
	this.addToMongo(conf.collections.rolls, data);
};

DiceLogger.prototype.report = function()
{

};

module.exports = DiceLogger;