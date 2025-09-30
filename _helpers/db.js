const config = require('config.json');
const mysql = require('mysql2/promise');
const { Sequelize, DataTypes } = require('sequelize');

const db = {};

initialize();

async function initialize() {
  const { host, port, user, password, database } = config.database;
  const connection = await mysql.createConnection({ host, port, user, password });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);

  const sequelize = new Sequelize(database, user, password, { dialect: 'mysql' });

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
    await sequelize.sync({ alter: true });
  }

module.exports = db;
