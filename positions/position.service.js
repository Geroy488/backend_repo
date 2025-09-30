// file: positions/position.service.js
const db = require('_helpers/db');

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: _delete
};

// ===== Service Methods =====
async function getAll() {
  const positions = await db.Position.findAll({
    include: [{ model: db.Employee, as: 'employees', attributes: ['id'] }],
    order: [['name', 'ASC']]
  });

  return positions.map(pos => ({
    id: pos.id,
    name: pos.name,
    description: pos.description,
    employeeCount: pos.employees ? pos.employees.length : 0
  }));
}

async function getById(id) {
  const pos = await db.Position.findByPk(id, {
    include: [
      {
        model: db.Employee,
        as: 'employees',
        attributes: ['id', 'employeeId', 'status']
      }
    ]
  });

  if (!pos) throw 'Position not found';

  return {
    id: pos.id,
    name: pos.name,
    description: pos.description,
    employeeCount: pos.employees ? pos.employees.length : 0,
    employees: pos.employees
  };
}

async function create(params) {
  return await db.Position.create({
    name: params.name,
    description: params.description
  });
}

async function update(id, params) {
  const pos = await db.Position.findByPk(id);
  if (!pos) throw 'Position not found';

  Object.assign(pos, params);
  await pos.save();
  return pos;
}

async function _delete(id) {
  const pos = await db.Position.findByPk(id);
  if (!pos) throw 'Position not found';

  await pos.destroy();
}
