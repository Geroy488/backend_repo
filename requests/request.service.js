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

    // 2️⃣ Automatically create a workflow for this request
    const workflow = await db.Workflow.create({
        type: request.type,  // matches frontend workflow type
        details: `Review ${request.type} request #${request.id} from Employee ${employee.employeeId}`,
        employeeId: employee.id,   // assign to the employee who created request
        requestId: request.id,     // link workflow to request
        status: 'Pending'
    });

    console.log('Workflow created:', workflow.toJSON()); // ✅ now it logs properly

    // 3️⃣ Return full request with relations
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
