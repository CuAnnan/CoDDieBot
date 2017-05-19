var DiceRoller = require ('./DiceRollActions.js');

var data = {
	pool: 7,
	sitMods: 2
},
rolls = {
	advanced:new DiceRoller.AdvancedAction(data),
	simple:new DiceRoller.SimpleAction(data),
	extended:new DiceRoller.ExtendedAction(data)
};

console.log(JSON.stringify(rolls));

