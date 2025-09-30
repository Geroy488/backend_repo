// file: employees/employee.service.js
const db = require('_helpers/db');

// ======================
// Exported functions
// ======================
module.exports = {
  getAll,
  getById,
  create,
  update,
  getNextEmployeeId,
  getByEmployeeId
};

// ======================
// Service Methods
// ======================

// Get all employees
async function getAll() {
  const employees = await db.Employee.findAll({
    include: [
      { model: db.Account, as: 'account', attributes: ['id', 'email', 'status'] },
      { model: db.Department, as: 'department', attributes: ['id', 'name'] },
      { model: db.Position, as: 'position', attributes: ['id', 'name'] }
    ],
    order: [['employeeId', 'ASC']]
  });

  return employees.map(emp => ({
    id: emp.id,
    accountId: emp.accountId,
    account: emp.account ? {
      id: emp.account.id,
      email: emp.account.email,
      status: emp.account.status
    } : null,
    employeeId: emp.employeeId,
    position: emp.position ? emp.position.name : null,
    positionId: emp.position ? emp.position.id : null,
    department: emp.department ? emp.department.name : null,
    departmentId: emp.department ? emp.department.id : null,
    hireDate: emp.hireDate,
    status: emp.status
  }));
}

// Get employee by ID
async function getById(id) {
  const emp = await db.Employee.findOne({
    where: { employeeId: id },
    include: [
      { model: db.Account, as: 'account', attributes: ['id','email','status'] },
      { model: db.Department, as: 'department', attributes: ['id','name'] },
      { model: db.Position, as: 'position', attributes: ['id','name'] }
    ]
  });

  if (!emp) throw 'Employee not found';

  return {
    id: emp.id,
    employeeId: emp.employeeId,
    accountId: emp.accountId,
    position: emp.position ? emp.position.name : null,
    positionId: emp.position ? emp.position.id : null,
    department: emp.department ? emp.department.name : null,
    departmentId: emp.department ? emp.department.id : null,
    hireDate: emp.hireDate,
    status: emp.status
  };
}

// Get next employee ID
async function getNextEmployeeId() {
  const last = await db.Employee.findOne({ order: [['employeeId', 'DESC']] });
  let nextNumber = 1;
  if (last) {
    const lastNum = parseInt(last.employeeId?.replace('EMP', '')) || 0;
    nextNumber = lastNum + 1;
  }
  return `EMP${String(nextNumber).padStart(3, '0')}`;
}

// Get workflows by employee ID
async function getByEmployeeId(employeeId) {
  console.log('Searching workflows for employeeId:', employeeId);
  const employee = await db.Employee.findOne({ where: { employeeId } });
  console.log('Found employee:', employee?.toJSON());

  const workflows = await db.Workflow.findAll({
    where: { employeeId: employee.id },
    include: [{ model: db.Employee, as: 'employee', attributes: ['id','employeeId'] }],
    order: [['id', 'ASC']]
  });

  console.log('Workflows found:', workflows.map(w => w.toJSON()));
  return workflows;
}

// Create new employee
async function create(params) {
  // Prevent duplicate account
  const existing = await db.Employee.findOne({ where: { accountId: params.accountId } });
  if (existing) throw `Account ID ${params.accountId} is already linked to an employee`;

      // Resolve department
    let department = null;
    if (params.department) {
        [department] = await db.Department.findOrCreate({
            where: { name: params.department },
            defaults: { description: '' }  // optional
        });
        params.departmentId = department.id;
    }

    // Resolve position
    let position = null;
    if (params.position) {
        [position] = await db.Position.findOrCreate({
            where: { name: params.position },
            defaults: { description: '' }
        });
        params.positionId = position.id;
    }

  // Create employee
  const employee = await db.Employee.create(params);

  // Default onboarding workflow
  const onboardingWorkflow = await db.Workflow.create({
    type: 'Onboarding',
    details: `Employee ${employee.employeeId} onboarded in ${department?.name || 'Department'}`,
    employeeId: employee.id,
    status: 'Pending'
  });

  return {
    ...employee.get({ plain: true }),
    workflows: [onboardingWorkflow]
  };
}

// Update employee
async function update(id, params) {
  const employee = await db.Employee.findOne({ where: { employeeId: id } });
  if (!employee) throw 'Employee not found';

  const oldDepartmentId = employee.departmentId;
  const oldPositionId = employee.positionId; // 🔹 track old position

  // Prevent duplicate account linkage
  if (params.accountId && params.accountId !== employee.accountId) {
    const existing = await db.Employee.findOne({ where: { accountId: params.accountId } });
    if (existing) throw `Account ID ${params.accountId} is already linked to another employee`;
    employee.accountId = params.accountId;
  }

  // Department update
  if (params.departmentId !== undefined && params.departmentId !== null) {
    const department = await db.Department.findByPk(params.departmentId);
    if (!department) throw 'Department not found';
    employee.departmentId = department.id;
  } else if (params.department) {
    const [department] = await db.Department.findOrCreate({
      where: { name: params.department },
      defaults: { description: '' }
    });
    employee.departmentId = department.id;
  }

  // Position update
  if (params.positionId !== undefined && params.positionId !== null) {
    const position = await db.Position.findByPk(params.positionId);
    if (!position) throw 'Position not found';
    employee.positionId = position.id;
  } else if (params.position) {
    const [position] = await db.Position.findOrCreate({ where: { name: params.position } });
    employee.positionId = position.id;
  }

  // Other fields
  if (params.position !== undefined) employee.position = params.position;
  if (params.status !== undefined) employee.status = params.status;
  if (params.hireDate !== undefined) employee.hireDate = params.hireDate;

  await employee.save();

  // Create workflow if department changed
  if (oldDepartmentId && oldDepartmentId !== employee.departmentId) {
    const oldDept = await db.Department.findByPk(oldDepartmentId);
    const newDept = await db.Department.findByPk(employee.departmentId);

    await db.Workflow.create({
      type: 'Department Transfer',
      details: `Transferred from ${oldDept?.name || 'Unknown'} to ${newDept?.name || 'Unknown'}`,
      status: 'Pending',
      employeeId: employee.id
    });
  }
  
  // 🔹 Create workflow if position changed
  if (oldPositionId && oldPositionId !== employee.positionId) {
    const oldPos = await db.Position.findByPk(oldPositionId);
    const newPos = await db.Position.findByPk(employee.positionId);

    await db.Workflow.create({
      type: 'Change Position',
      details: `Changed position from ${oldPos?.name || 'Unknown'} to ${newPos?.name || 'Unknown'}`,
      status: 'Pending',
      employeeId: employee.id
    });
  }

  // Return updated employee
  const updatedEmployee = await db.Employee.findOne({
    where: { id: employee.id },
     include: [
      { model: db.Department, as: 'department', attributes: ['id','name'] },
      { model: db.Position, as: 'position', attributes: ['id','name'] }
    ]
  });

  return {
    ...employee.get({ plain: true }),
    department: updatedEmployee.department ? updatedEmployee.department.name : null,
    departmentId: updatedEmployee.department ? updatedEmployee.department.id : null,
    position: updatedEmployee.position ? updatedEmployee.position.name : null,
    positionId: updatedEmployee.position ? updatedEmployee.position.id : null
  };
}
