# sequelize-extendedtable
> Add a functionality to sequelize 4 for extanding tables

## Installation
```
npm install sequelize-extendedtable --save
```

## Usage
### Initialisation
Init Sequelize-ExtendedTable module before importing models
```
const Sequelize = require('sequelize');
const SequelizeExtendedTable = require('sequelize-extendedtable');

let sequelize = new Sequelize('mybase', 'root', '', {  
	host: 'localhost',
	dialect: 'mysql'
});

SequelizeExtendedTable.init(sequelize);
```

## Examples

### Table "users"
|id|type|name|
|--|--|--|
|1|admins|Chuck Norris|
|2|employees|James Bond|

### Table "users_admins"
|id|level|
|--|--|
|1|BOSS|

### Table "users_employees"
|id|has_desk|
|--|--|
|2|true|

```
const Sequelize = require('sequelize');
const SequelizeExtendedTable = require('sequelize-extendedtable');

let sequelize = new Sequelize('mybase', 'root', '', {  
	host: 'localhost',
	dialect: 'mysql'
});

SequelizeExtendedTable.init(sequelize);

let User = sequelize.define('user', {  
    type: {
        type: DataTypes.ENUM,
		  values: ['', 'admins', 'employees']
    },
    name: {  
        type: DataTypes.STRING
    }
});

let UserAdmin = sequelize.define('users_admin', {  
    level: {  
        type: DataTypes.STRING
    }
});

let UserEmployee = sequelize.define('users_employee', {  
    has_desk: {  
        type: DataTypes.BOOLEAN
    }
});
```
```
User.extended({
	foreignKey: 'id',
	extendedField: 'type',
	models: {
		admins: UserAdmin,
		employees: UserEmployee
	}
});
```

#### Options
|property|default|description|
|--|--|--|
|foreignKey|'id'|The name of the property that module uses for association|
|extendedField|'extended'|The name the property that module uses for "extended" table name.
|models|{}|Object containing "extended" tables|


### Create a new instance
```
User.create({
	type: 'admins',
	name: 'Chuck Norris',
	level: 'ULTIMATE BOSS'
})
	.then((product) => {
		console.log(product);
	});

// Will add a new row in table "users" AND in "users_admins"
```

### Get an instance
```
User.find().where({ id: 1 })
	.then((user) => {
		console.log(user.level); // "BOSS"
		console.log(user.has_desk); // undefined
	});



`````````