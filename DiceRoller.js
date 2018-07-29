function extend(object, data, defaults)
{
	object = object?object:{};
	data = data?data:defaults;
	if(data !== object)
	{
		for (var i in defaults)
		{
			if (!data[i] && !object[i])
			{
				data[i] = defaults[i];
			}
		}
	}

	for(var i in data)
	{
		if(!object[i])
		{
			object[i] = data[i];
		}
	}
}

function Die(data)
{
	extend(
		this,
		data,
		{
			explodesOn: 10,
			succeedsOn: 8,
			rote:false
		}
	);
	this.successes = 0;
	this.results = [];
}

Die.prototype.addExtraDie = function()
{
	var otherDie = new Die({explodesOn:this.explodesOn, succeedsOn:this.succeedsOn}).roll();
	this.successes += otherDie.successes;
	this.results = this.results.concat(otherDie.results);
};

Die.prototype.roll = function()
{
	var result = Math.floor(Math.random() * 10) + 1;
	this.results.push(result);

	if(result >= this.succeedsOn)
	{
		this.successes ++;
		if(result >= this.explodesOn)
		{
			this.addExtraDie();
		}
	}
	else if(this.rote)
	{
		this.addExtraDie();
	}
	return this;
};

Die.prototype.toJSON = function()
{
	return this.results;
};

function Action(data)
{
	this.performed = false;
	this.successes = 0;
}

Action.prototype.perform = function()
{
	if(this.performed)
	{
		return this;
	}
	this.performed = true;
	this.rollDice();
	return this;
};

Action.prototype.isExceptional = function()
{
	return this.successes >= this.exceptionalThreshold;
}

Action.prototype.getSuccesses = function()
{
	this.perform();
	return this.successes;
}

Action.prototype.rollDice = function()
{
	for(var i = 0; i < this.diceToRoll; i++)
	{
		var die = new Die(this).roll();
		this.successes += die.successes;
		this.dice.push(die);
	}
};



function SimpleAction(data, comment)
{
	extend(
		this,
		data,
		{
			pool:5,
			sitMods:0,
			explodesOn:10,
			succeedsOn:8,
			exceptionalThreshold:5,
			rote:false
		}
	);
	this.diceToRoll = this.pool + this.sitMods;
	this.dice = [];
	this.comment = comment;
}

SimpleAction.prototype = new Action;
SimpleAction.prototype.constructor = SimpleAction;

SimpleAction.prototype.toJSON = function()
{
	this.perform();
	var toEncode = [
		'pool', 'sitMods', 'explodesOn', 'succeedsOn', 'exceptionalThreshold', 'rote', 'successes'
	];
	var data = {dice:this.getDiceJSON()};
	for(let value of toEncode)
	{
		data[value] = this[value];
	}
	return data;
};

SimpleAction.prototype.getDiceJSON = function()
{
	var dice = [];
	for(let value of this.dice)
	{
		dice.push(value.toJSON());
	}
	return dice;
}

SimpleAction.prototype.getResults = function()
{
	this.perform();
	var string = 'Successes: '+this.successes;
	if(this.successes >= this.exceptionalThreshold)
	{
		string += ', Exceptional Success';
	}
	string += ', Rolls: (';
	var rolls = [];
	for(var i in this.dice)
	{
		rolls.push(
			'['+this.dice[i].results.join(', ')+']'
		);
	}
	string+= rolls.join(', ')+')';
	return string;
};

function AdvancedAction(data, comment)
{
	extend(
		this,
		data,
		{
			pool:5,
			sitMods:0,
			explodesOn:10,
			succeedsOn:8,
			exceptionalThreshold:5,
			rote:false
		}
	);
	this.attempt1 = new SimpleAction(data).perform();
	this.attempt2 = new SimpleAction(data).perform();
	this.firstIsBetter = this.attempt1.successes >= this.attempt2.successes;
	this.betterRoll = this.firstIsBetter?this.attempt1:this.attempt2;
	this.successes = this.betterRoll.successes;
	this.comment = comment;
}

AdvancedAction.prototype = new Action;
AdvancedAction.prototype.constructor = AdvancedAction;

AdvancedAction.prototype.perform = function()
{
	return this;
};

AdvancedAction.prototype.getResults = function(joinResults)
{
	let results = [this.attempt1.getResults()+(this.firstIsBetter?'*':''),
			this.attempt2.getResults()+(this.firstIsBetter?'':'*')];
	if(joinResults)
	{
		return results.join('\n');
	}
	return results;
};

AdvancedAction.prototype.toJSON = function()
{
	this.perform();
	var toEncode = [
		'pool', 'sitMods', 'explodesOn', 'succeedsOn', 'exceptionalThreshold', 'rote', 'successes'
	];
	var data = {
		rolls:[
			this.attempt1.getDiceJSON(),
			this.attempt2.getDiceJSON()
		]
	};
	for(let value of toEncode)
	{
		data[value] = this[value];
	}

	return data;
};

AdvancedAction.prototype.getDiceJSON = function()
{
	return [
		this.attempt1.getDiceJSON(),
		this.attempt2.getDiceJSON()
	];
}

function ExtendedAction(data, comment)
{
	extend(
		this,
		data,
		{
			pool:5,
			sitMods:0,
			explodesOn:10,
			succeedsOn:8,
			exceptionalThreshold:5,
			rote:false,
			advanced:false,
			successThreshold:10
		}
	);
	this.rollsPerformed = false;
	this.rolls = [];
	this.totalSuccesses = 0;
	this.totalExceptionalSuccesses = 0;
	this.comment = comment;
}

ExtendedAction.prototype = new Action;
ExtendedAction.prototype.constructor = ExtendedAction;

ExtendedAction.prototype.toJSON = function()
{
	this.perform();
	var toEncode = [
		'pool', 'sitMods', 'explodesOn', 'succeedsOn', 'exceptionalThreshold', 'rote', 'successes'
	];
	var data = {
		rolls:[]
	}
	for(let i in this.rolls)
	{
		data.rolls.push(this.rolls[i].getDiceJSON());
	}
	for(let i of toEncode)
	{
		data[i] = this[i];
	}
	return data;
};

ExtendedAction.prototype.perform = function() {
	if (this.rollsPerformed)
	{
		return this;
	}
	this.rollsPerformed = true;
	this.totalSuccesses = 0;
	let RollType = this.advanced ? AdvancedAction : SimpleAction,
		rolls = 0, rolling = true;
	while (rolling)
	{
		let roll = new RollType(this);
		roll.perform();
		this.totalSuccesses += roll.getSuccesses();
		if(roll.isExceptional())
		{
			this.totalExceptionalSuccesses++;
		}
		this.rolls.push(roll);
		
		if(rolls >= this.pool || this.totalSuccesses >= this.successThreshold)
		{
			rolling = false;
		}
	}
	return this;
}

ExtendedAction.prototype.getSuccesses = function()
{
	this.perform();
	return this.totalSuccesses;
};

ExtendedAction.prototype.getResults = function()
{
	this.perform();
	var resultTextFields = [
		'Result:',
		'Successes: '+this.totalSuccesses +'/'+this.successThreshold
	];
	
	if(this.totalExceptionalSuccesses)
	{
		resultTextFields.push('Exceptional successes: '+this.totalExceptionalSuccesses);
	}
	for(var i in this.rolls)
	{
		let results = this.rolls[i].getResults(this.advanced);
		resultTextFields.push('Roll '+(parseInt(i)+1)+' of '+this.pool);
		resultTextFields.push('\t'+results.split('\n').join('\n\t'));
		resultTextFields.push('====================================================');
	}
	
	return resultTextFields;
}

module.exports = {SimpleAction:SimpleAction, AdvancedAction:AdvancedAction, ExtendedAction:ExtendedAction};