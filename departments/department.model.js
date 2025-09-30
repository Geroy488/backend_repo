// file: departments/department.model.js
const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.STRING, allowNull: true }
    };

    const options = { timestamps: false };

    const Department = sequelize.define('Department', attributes, options);

    Department.associate = (models) => {
        Department.hasMany(models.Employee, {
            foreignKey: 'departmentId',
            as: 'employees'
        });
    };

    return Department;
}
