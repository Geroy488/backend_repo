//const config = require('config.json');
require('dotenv').config();
const mysql = require('mysql2/promise');
const { Sequelize, DataTypes } = require('sequelize');

const db = {};

initialize();

async function initialize() {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || 3306;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  try {
      console.log(`🔗 Connecting to database ${database} at ${host}:${port}...`);

      // Initialize Sequelize
      const sequelize = new Sequelize(database, user, password, {
        host,
        port,
        dialect: 'mysql',
        logging: false, // turn on for debugging
  });

  // init models
  db.Account = require('../accounts/account.model')(sequelize, DataTypes);
  db.RefreshToken = require('../accounts/refresh-token.model')(sequelize, DataTypes);
  db.Employee = require('../employees/employee.model')(sequelize, DataTypes);
  db.Request = require('../requests/request.model')(sequelize, DataTypes);
  db.Workflow = require('../workflows/workflow.model')(sequelize, DataTypes);
  db.Department = require('../departments/department.model')(sequelize, DataTypes);
  db.Position = require('../positions/position.model')(sequelize, DataTypes);

  // ===============================
  // 🔗 Define Relationships
  // ===============================

  // Account ↔ RefreshToken
  db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
  db.RefreshToken.belongsTo(db.Account);

  // Account ↔ Employee
  db.Account.hasMany(db.Employee, { foreignKey: 'accountId', as: 'employees', onDelete: 'CASCADE' });
  db.Employee.belongsTo(db.Account, { foreignKey: 'accountId', as: 'account' });

  // Employee ↔ Workflow
  db.Employee.hasMany(db.Workflow, { foreignKey: 'employeeId', as: 'workflows', onDelete: 'CASCADE' });
  db.Workflow.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });

  // Request ↔ Workflow
  db.Request.hasMany(db.Workflow, { foreignKey: 'requestId', as: 'workflows', onDelete: 'CASCADE' });
  db.Workflow.belongsTo(db.Request, { foreignKey: 'requestId', as: 'request' });

  // Employee ↔ Request
  db.Employee.hasMany(db.Request, { foreignKey: 'employeeId', as: 'requests', onDelete: 'CASCADE' });
  db.Request.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });

  // Department ↔ Employee
  db.Department.hasMany(db.Employee, { foreignKey: 'departmentId', as: 'employees', onDelete: 'SET NULL' });
  db.Employee.belongsTo(db.Department, { foreignKey: 'departmentId', as: 'department' });
  
  // Position ↔ Employee
  db.Position.hasMany(db.Employee, { foreignKey: 'positionId', as: 'employees', onDelete: 'SET NULL' });
  db.Employee.belongsTo(db.Position, { foreignKey: 'positionId', as: 'position' });
    
  //await sequelize.sync({ alter: true });
  
  // ===============================
    // ✅ Sync database (safe for production)
    // ===============================
    // Use alter: true or force: true only in development
    const isDev = process.env.NODE_ENV !== 'production';
    await sequelize.sync({ alter: isDev }); // alters tables in dev, but not prod
    console.log(`✅ Sequelize synced. (alter=${isDev})`);

    // Attach Sequelize instance and models
    db.sequelize = sequelize;
    db.Sequelize = Sequelize;

  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    process.exit(1); // stop server if DB fails
  }
}

module.exports = db;


// const config = require('../config.json');   // ✅ adjust path if needed
// const { Sequelize, DataTypes } = require('sequelize');

// const db = {};

// initialize();

// async function initialize() {
//   // pull DB settings directly from config.json
//   const dbConfig = config.database;

//   const sequelize = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, {
//     host: dbConfig.host,
//     port: dbConfig.port || 3306,
//     dialect: 'mysql',
//     logging: false
//   });

//   // init models
//   db.Account = require('../accounts/account.model')(sequelize, DataTypes);
//   db.RefreshToken = require('../accounts/refresh-token.model')(sequelize, DataTypes);
//   db.Employee = require('../employees/employee.model')(sequelize, DataTypes);
//   db.Request = require('../requests/request.model')(sequelize, DataTypes);
//   db.Workflow = require('../workflows/workflow.model')(sequelize, DataTypes);
//   db.Department = require('../departments/department.model')(sequelize, DataTypes);
//   db.Position = require('../positions/position.model')(sequelize, DataTypes);

//   // ===============================
//   // 🔗 Define Relationships
//   // ===============================

//   db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
//   db.RefreshToken.belongsTo(db.Account);

//   db.Account.hasMany(db.Employee, { foreignKey: 'accountId', as: 'employees', onDelete: 'CASCADE' });
//   db.Employee.belongsTo(db.Account, { foreignKey: 'accountId', as: 'account' });

//   db.Employee.hasMany(db.Workflow, { foreignKey: 'employeeId', as: 'workflows', onDelete: 'CASCADE' });
//   db.Workflow.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });

//   db.Request.hasMany(db.Workflow, { foreignKey: 'requestId', as: 'workflows', onDelete: 'CASCADE' });
//   db.Workflow.belongsTo(db.Request, { foreignKey: 'requestId', as: 'request' });

//   db.Employee.hasMany(db.Request, { foreignKey: 'employeeId', as: 'requests', onDelete: 'CASCADE' });
//   db.Request.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });

//   db.Department.hasMany(db.Employee, { foreignKey: 'departmentId', as: 'employees', onDelete: 'SET NULL' });
//   db.Employee.belongsTo(db.Department, { foreignKey: 'departmentId', as: 'department' });

//   db.Position.hasMany(db.Employee, { foreignKey: 'positionId', as: 'employees', onDelete: 'SET NULL' });
//   db.Employee.belongsTo(db.Position, { foreignKey: 'positionId', as: 'position' });

//   // sync database
//   await sequelize.sync({ alter: true });
// }

// module.exports = db;
