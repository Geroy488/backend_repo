// workflow.model.js
module.exports = (sequelize, DataTypes) => {
  const Workflow = sequelize.define('Workflow', {
    type: { type: DataTypes.STRING, allowNull: false },
    details: { type: DataTypes.STRING, allowNull: false },
    status: { 
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'), 
    allowNull: false, 
    defaultValue: 'Pending' 
    },
     employeeId: { type: DataTypes.INTEGER, allowNull: false },   // 👈 required FK
     requestId: { type: DataTypes.INTEGER, allowNull: true }      // 👈 optional FK
  });

  // ❌ remove Workflow.associate
  // Because associations are already defined in db.js

  return Workflow;
};
