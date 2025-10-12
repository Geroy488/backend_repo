// file: positions/position.service.js
const db = require('_helpers/db');

module.exports = {
  getAll,
  getEnabled,
  getById,
  create,
  update
  //toggleStatus
};

// ===== Service Methods =====

// 📋 Get all positions, ordered by ID
async function getAll() {
  const positions = await db.Position.findAll({
    order: [['id', 'ASC']]
  });

  return positions.map(pos => ({
    id: pos.id,
    name: pos.name,
    description: pos.description,
    status: pos.status
  }));
}

async function getEnabled() {
  const positions = await db.Position.findAll({
    where: { status: 'ENABLE' },
    order: [['id', 'ASC']]
  });

  return positions.map(pos => ({
    id: pos.id,
    name: pos.name,
    description: pos.description,
    status: pos.status
  }));
}

// 📋 Get a single position by ID
async function getById(id) {
  const pos = await db.Position.findByPk(id);

  if (!pos) throw 'Position not found';

  return {
    id: pos.id,
    name: pos.name,
    description: pos.description,
    status: pos.status
  };
}

// ➕ Create a new position
async function create(params) {
  return await db.Position.create({
    name: params.name,
    description: params.description,
    status: params.status || 'ENABLE' // ✅ Uses selected status or defaults to ENABLE
  });
}

// ✏️ Update position details (including status)
async function update(id, params) {
  const pos = await db.Position.findByPk(id);
  if (!pos) throw 'Position not found';

  Object.assign(pos, params);
  await pos.save();

  return pos;
}

// // 🔄 Toggle position status (ENABLE/DISABLE)
// async function toggleStatus(id) {
//   const pos = await db.Position.findByPk(id);
//   if (!pos) throw 'Position not found';

//   pos.status = pos.status === 'ENABLE' ? 'DISABLE' : 'ENABLE';
//   await pos.save();

//   return pos;
// }
