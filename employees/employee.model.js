// file: employees/employee.model.js
const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // 👈 must exist
        employeeId: { type: DataTypes.STRING, unique: true },
        departmentId: { type: DataTypes.INTEGER, allowNull: true },  // 👈 FK now
        positionId: { type: DataTypes.INTEGER, allowNull : true, references: {model: 'Positions', key: 'id'}},  // ✅ use relation
        hireDate: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
        accountId: { type: DataTypes.INTEGER, allowNull: false },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Active' },
    };

    const options = {
        timestamps: false,
        hooks: {
            async beforeCreate(employee) {
                const last = await sequelize.models.Employee.findOne({
                    order: [['employeeId', 'DESC']]
                });
                let nextNumber = 1;
                if (last) {
                    const lastNum = parseInt(last.employeeId?.replace('EMP', '')) || 0;
                    nextNumber = lastNum + 1;
                }
                employee.employeeId = `EMP${String(nextNumber).padStart(3, '0')}`;
            }
        }
    };

    const Employee = sequelize.define('Employee', attributes, options);

    // === ASSOCIATIONS ===
    Employee.associate = (models) => {
        // Employee has many requests
        Employee.hasMany(models.Request, {
            foreignKey: 'employeeId',
            as: 'requests'
        });

        // Employee belongs to Account
        Employee.belongsTo(models.Account, {
            foreignKey: 'accountId',
            as: 'account'
        });

        Employee.belongsTo(models.Department, { 
        foreignKey: 'departmentId', 
        as: 'department' });

        // 👇 ADD THIS: Employee belongs to Position
        Employee.belongsTo(models.Position, { 
            foreignKey: 'positionId', 
            as: 'position' 
        });
    };
    return Employee;
}
