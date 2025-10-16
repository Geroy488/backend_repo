module.exports = (sequelize, DataTypes) => {
  const Request = sequelize.define('Request', {
    type: { type: DataTypes.STRING, allowNull: false },
    items: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'Pending' },
    employeeId: { type: DataTypes.INTEGER, allowNull: false },
    createdByRole: { type: DataTypes.STRING, allowNull: false, defaultValue: 'User' }, // 👈 new
    approverId: { type: DataTypes.INTEGER, allowNull: true },
  });

  Request.associate = (models) => {
    Request.belongsTo(models.Employee, {
      foreignKey: 'employeeId',
      as: 'employee'
    });
  };

  return Request;
};
