const db = require('_helpers/db');

module.exports = {
    getAll,
    getById,
    create,
    update,
    getActiveEmployees,
    getAllEmployees,
    getByEmployeeId
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
// ✅ Update request and create workflow log with role tracking
// ✅ Update request and create detailed workflow log
async function update(id, params) {
    const request = await getById(id);
    if (!request) throw new Error('Request not found');

    // 🟡 Keep old values for comparison
    const oldType = request.type;
    const oldItems = request.items;
    const oldStatus = request.status;
    const editedByRole = params.createdByRole || 'User';

    // 🟢 Apply updates
    Object.assign(request, params);
    await request.save();

    const updatedRequest = await getById(request.id);
    const changes = [];

    // 🧩 Compare type
    if (params.type && params.type !== oldType)
        changes.push(`Type changed from "${oldType}" → "${params.type}"`);

    // 🧩 Compare status
    if (params.status && params.status !== oldStatus)
        changes.push(`Status changed from "${oldStatus}" → "${params.status}"`);

    // 🧩 Compare items in detail
    if (params.items && params.items !== oldItems) {
        const oldList = oldItems.split(',').map(s => s.trim());
        const newList = params.items.split(',').map(s => s.trim());

        // Loop through both old & new to detect detailed changes
        for (let i = 0; i < Math.max(oldList.length, newList.length); i++) {
            const oldItem = oldList[i];
            const newItem = newList[i];

            if (!oldItem && newItem) {
                changes.push(`Added new item "${newItem}"`);
            } else if (oldItem && !newItem) {
                changes.push(`Removed item "${oldItem}"`);
            } else if (oldItem && newItem && oldItem !== newItem) {
                changes.push(`Updated item from "${oldItem}" → "${newItem}"`);
            }
        }
    }

    // 🧾 Build readable log text
    const actor =
        editedByRole === 'Admin'
            ? 'Admin'
            : `Employee ${updatedRequest.employee.employeeId}`;

    const details =
        changes.length > 0
            ? `${actor} edited request #${updatedRequest.id}: ${changes.join(', ')}.`
            : `${actor} edited request #${updatedRequest.id}.`;

    // 🪄 Log workflow entry
    await db.Workflow.create({
        type: updatedRequest.type,
        details,
        employeeId: updatedRequest.employeeId,
        requestId: updatedRequest.id,
        status: updatedRequest.status || 'Pending'
    });

    console.log('✅ Workflow created for request update:', details);

    return updatedRequest;
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
        employeeId: employee.id,
        createdByRole: createdByRole ||  (employee.account?.role || 'User') // ✅ auto assign based on who created
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

// ✅ Fetch requests for a specific employee
async function getByEmployeeId(employeeId) {
  const requests = await db.Request.findAll({
    where: { employeeId },
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
    ],
    order: [['id', 'ASC']]
  });

  return requests;
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
