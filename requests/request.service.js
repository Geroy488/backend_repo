const db = require('_helpers/db');

module.exports = {
    getAll,
    getById,
    create,
    update,
    getActiveEmployees,
    getAllEmployees
};

// ------------------ FUNCTIONS ------------------

// ✅ Fetch all requests with their employees + account info
async function getAll() {
    const requests = await db.Request.findAll({
        include: [
            {
                model: db.Employee,
                as: 'employee',
                attributes: ['id', 'employeeId', 'positionId', 'departmentId', 'hireDate', 'status'],
                include: [
                    {
                        model: db.Account,
                        as: 'account',
                        attributes: ['id', 'email', 'status']
                    },
                    { 
                        model: db.Department, 
                        as: 'department', 
                        attributes: ['name'] // get department name
                    },
                    {
                        model: db.Position,
                        as: 'position',
                        attributes: ['name'] 
                    }
                ]
            }
        ],
        order: [['id', 'ASC']]
    });

    return requests;
}

// ✅ Fetch a single request by ID
async function getById(id) {
    return await db.Request.findByPk(id, {
        include: [
            {
                model: db.Employee,
                as: 'employee',
                attributes: ['id', 'employeeId', 'positionId', 'departmentId', 'hireDate', 'status'],
                include: [
                    { model: db.Account, as: 'account', attributes: ['id', 'email', 'status'] },
                    { model: db.Department, as: 'department', attributes: ['name'] },
                    { model: db.Position, as: 'position', attributes: ['name'] }
                ]
            }
        ]
    });
}

// // ✅ Create a new request (allows inactive employees)
// async function create(params) {
//     const { type, items, status, employeeId } = params;

//     if (!employeeId) throw new Error('Employee is required');

//     // request.service.js
//     const employee = await db.Employee.findByPk(employeeId, {
//     include: [{ model: db.Account, as: 'account' }]
//     });
    
//     if (!employee) throw new Error('Employee not found');

//     // Log if employee account is inactive
//     if (employee.account?.status !== 'Active') {
//         console.warn(`Creating request for inactive employee: ${employee.employeeId}`);
//     }

//     const request = await db.Request.create({
//         type,
//         items,
//         status: status || 'Pending',
//         employeeId: employee.id
//     });

//     return await getById(request.id);
// }

// ✅ Update request
async function update(id, params) {
    const request = await getById(id);
    if (!request) throw new Error('Request not found');

    Object.assign(request, params);
    await request.save();

    return await getById(request.id);
}

// ✅ Create a new request (allows inactive employees)
async function create(params) {
    const { type, items, status, employeeId } = params;

    if (!employeeId) throw new Error('Employee is required');

    const employee = await db.Employee.findByPk(employeeId, {
        include: [{ model: db.Account, as: 'account' }]
    });
    if (!employee) throw new Error('Employee not found');

    // Log if employee account is inactive
    if (employee.account?.status !== 'Active') {
        console.warn(`Creating request for inactive employee: ${employee.employeeId}`);
    }

    // 1️⃣ Create the request
    const request = await db.Request.create({
        type,
        items,
        status: status || 'Pending',
        employeeId: employee.id
    });

    // 2️⃣ Assign workflow to an Admin employee
    const adminEmployee = await db.Employee.findOne({
        include: [
            { model: db.Account, as: 'account', where: { role: 'Admin' } }
        ]
    });

    if (!adminEmployee) {
        console.warn('⚠️ No admin employee found. Workflow not created.');
    } else {
       // 2️⃣ Create workflow for the requesting employee
        await db.Workflow.create({
            type: 'Request Approval',
            details: `Review ${request.type} request #${request.id} from ${employee.employeeId}.`,
            employeeId: employee.id,   // 👈 belongs to the employee who made the request
            requestId: request.id,
            status: 'Pending'
        });
    }

    // Return full request with relations
    return await getById(request.id);
}


// ✅ Fetch employees with active accounts (for dropdown)
async function getActiveEmployees() {
    const employees = await db.Employee.findAll({
        include: [
            {
                model: db.Account,
                as: 'account',
                attributes: ['id', 'email', 'status'],
                where: { status: 'Active' }
            }
        ],
        order: [['employeeId', 'ASC']]
    });

    return employees.map(e => ({
        id: e.id,
        employeeId: e.employeeId,
        account: e.account ? { id: e.account.id, email: e.account.email } : null
    }));
}

// ✅ Fetch all employees (active + inactive)
async function getAllEmployees() {
    const employees = await db.Employee.findAll({
        include: [
            {
                model: db.Account,
                as: 'account',
                attributes: ['id', 'email', 'status']
            }
        ],
        order: [['employeeId', 'ASC']]
    });

    return employees.map(e => ({
        id: e.id,
        employeeId: e.employeeId,
        account: e.account
            ? { id: e.account.id, email: e.account.email, status: e.account.status }
            : null
    }));
}
