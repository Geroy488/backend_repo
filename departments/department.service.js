// file: departments/department.service.js
const db = require('_helpers/db');

module.exports = {
  getAll,
  getById,
  create,
  update,
};

// ===== Service Methods =====
async function getAll() {
  const departments = await db.Department.findAll({
    include: [{ model: db.Employee, as: 'employees', attributes: ['id'] }],
    order: [['name', 'ASC']]
  });

  return departments.map(dep => ({
    id: dep.id,
    name: dep.name,
    description: dep.description,
    employeeCount: dep.employees ? dep.employees.length : 0
  }));
}

async function getById(id) {
  const dep = await db.Department.findByPk(id, {
    include: [
      {
        model: db.Employee,
        as: 'employees',
        attributes: ['id', 'employeeId', 'position', 'status']
      }
    ]
  });

  if (!dep) throw 'Department not found';

  return {
    id: dep.id,
    name: dep.name,
    description: dep.description,
    employeeCount: dep.employees ? dep.employees.length : 0,
    employees: dep.employees // 👈 optional: return full list of employees
  };
}

async function create(params) {
  // simple department creation
  return await db.Department.create({
    name: params.name,
    description: params.description
  });
}

async function update(id, params) {
  const dep = await db.Department.findByPk(id);
  if (!dep) throw 'Department not found';

  Object.assign(dep, params);
  await dep.save();
  return dep;
}
