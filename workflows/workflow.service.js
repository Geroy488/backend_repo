//workflow.service
const db = require('_helpers/db');

module.exports = {
    getAll,
    getByEmployeeId,
    getById,
    create,
    update
};

// ------------------ FUNCTIONS ------------------

async function getAll() {
    return await db.Workflow.findAll({
        include: [
            {
                model: db.Employee,
                as: 'employee',
                attributes: ['id', 'employeeId', 'positionId', 'departmentId', 'hireDate', 'status'],
                include: [
                    { model: db.Account, as: 'account', attributes: ['id', 'email', 'status'] },
                    { model: db.Department, as: 'department', attributes: ['name'] }
                ]
            },
            {
                model: db.Request,
                as: 'request',
                attributes: ['id', 'type', 'status', 'items']
            }
        ],
        order: [['id', 'ASC']]
    });
}

async function getById(id) {
    return await db.Workflow.findByPk(id, {
        include: [
            {
                model: db.Employee,
                as: 'employee',
                attributes: ['id', 'employeeId', 'positionId', 'departmentId', 'hireDate', 'status'],
                include: [
                    { model: db.Account, as: 'account', attributes: ['id', 'email', 'status'] },
                    { model: db.Department, as: 'department', attributes: ['name'] }
                ]
            },
            {
                model: db.Request,
                as: 'request',
                attributes: ['id', 'type', 'status', 'items']
            }
        ]
    });
}

async function getByEmployeeId(employeeId) {
    const employee = await db.Employee.findOne({ where: { employeeId } });
    if (!employee) throw new Error('Employee not found');

    return await db.Workflow.findAll({
        where: { employeeId: employee.id },
        include: [
            {
                model: db.Employee,
                as: 'employee',
                attributes: ['id', 'employeeId', 'positionId', 'departmentId', 'hireDate', 'status'],
                include: [
                    { model: db.Position, as: 'position', attributes: ['name'] }, // add this
                    { model: db.Account, as: 'account', attributes: ['id', 'email', 'status'] },
                    { model: db.Department, as: 'department', attributes: ['name'] }
                ]
            },
            {
                model: db.Request,
                as: 'request',
                attributes: ['id', 'type', 'status', 'items']
            }
        ],
        order: [['id', 'ASC']]
    });
}

async function create(params) {
    const { type, details, status, employeeId, requestId } = params;

    if (!employeeId) throw new Error('Employee is required');

    const employee = await db.Employee.findByPk(employeeId, {
        include: [{ model: db.Account, as: 'account' }]
    });
    if (!employee) throw new Error('Employee not found');

    const workflow = await db.Workflow.create({
        type,
        details,
        status: status || 'Pending',
        employeeId: employee.id,
        requestId: requestId || null
    });

    return await getById(workflow.id);
}

async function update(id, params) {
    const workflow = await db.Workflow.findByPk(id, {
        include: [{ model: db.Request, as: 'request' }]
    });
    if (!workflow) throw new Error('Workflow not found');

    Object.assign(workflow, params);
    await workflow.save();

    // 🔑 Sync request status if workflow has requestId
    if (workflow.requestId && params.status) {
        const request = await db.Request.findByPk(workflow.requestId);
        if (request) {
            request.status = params.status;
            await request.save();
        }
    }

    return await getById(workflow.id);
}
