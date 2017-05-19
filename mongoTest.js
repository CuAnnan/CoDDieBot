var MongoClient = require('mongodb').MongoClient,
	assert = require('assert'),
	url = 'mongodb://localhost:27017/dieRolls';

MongoClient.connect(
	url,
	function(err, db)
	{
		if(!err)
		{

		}
	}
);

