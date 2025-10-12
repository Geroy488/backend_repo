// file: positions/position.model.js
const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
  const attributes = {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING, allowNull: true },
  status: { 
    type: DataTypes.ENUM('ENABLE', 'DISABLE'), 
    allowNull: false, 
    defaultValue: 'ENABLE' 
  }
};

  const options = { timestamps: false };

  const Position = sequelize.define('Position', attributes, options);

  Position.associate = (models) => {
    Position.hasMany(models.Employee, {
      foreignKey: 'positionId',
      as: 'employees'
    });
  };

  return Position;
}
