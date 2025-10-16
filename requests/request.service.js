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
        where: {
            status: { [db.Sequelize.Op.in]: ['Pending', 'Approved', 'Rejected'] } // only visible statuses
        },
            include: [
                {
                    model: db.Employee,
                    as: 'employee',
                    attributes: ['id', 'employeeId', 'positionId', 'departmentId', 'hireDate', 'status'],
                    include: [
                        {
                            model: db.Account,
                            as: 'account',
                            attributes: ['id', 'email', 'status', 'role']
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

    // ✅ Update request with full debug logging
async function update(id, params) {
    console.log('🟡 Incoming update request:', { id, params });

    const request = await getById(id);
    if (!request) throw new Error('Request not found');

    const oldType = request.type;
    const oldItems = request.items;
    const oldStatus = request.status;
    const editedByRole = params.createdByRole || 'User';

    // Apply updates
    Object.assign(request, params);

    try {
        await request.save();
        console.log(`✅ Request #${id} saved successfully`);
    } catch (err) {
        console.error('❌ Error saving request:', err.message);
        throw err;
    }

    let updatedRequest;
    try {
        updatedRequest = await getById(request.id);
        console.log('🔁 Reloaded updated request successfully');
    } catch (err) {
        console.error('❌ Failed to reload updated request:', err.message);
        updatedRequest = request;
    }

    const changes = [];

    if (params.type && params.type !== oldType)
        changes.push(`Type changed from "${oldType}" → "${params.type}"`);

    if (params.status && params.status !== oldStatus)
        changes.push(`Status changed from "${oldStatus}" → "${params.status}"`);

    if (params.items && params.items !== oldItems) {
        const oldList = Array.isArray(oldItems)
            ? oldItems
            : (typeof oldItems === 'string' ? oldItems.split(',').map(s => s.trim()) : []);
        const newList = Array.isArray(params.items)
            ? params.items
            : (typeof params.items === 'string' ? params.items.split(',').map(s => s.trim()) : []);

        for (let i = 0; i < Math.max(oldList.length, newList.length); i++) {
            const oldItem = oldList[i];
            const newItem = newList[i];
            if (!oldItem && newItem) changes.push(`Added new item "${newItem}"`);
            else if (oldItem && !newItem) changes.push(`Removed item "${oldItem}"`);
            else if (oldItem && newItem && oldItem !== newItem)
                changes.push(`Updated item from "${oldItem}" → "${newItem}"`);
        }
    }

    const actor =
        editedByRole === 'Admin'
            ? 'Admin'
            : updatedRequest?.employee
                ? `Employee ${updatedRequest.employee.employeeId}`
                : 'Unknown Employee';

    const details =
        changes.length > 0
            ? `${actor} edited request #${updatedRequest.id}: ${changes.join(', ')}.`
            : `${actor} edited request #${updatedRequest.id}.`;

    try {
        await db.Workflow.create({
            type: updatedRequest.type,
            details,
            employeeId: updatedRequest.employeeId || request.employeeId || null,
            requestId: updatedRequest.id,
            status: updatedRequest.status === 'Draft' ? 'Pending' : (updatedRequest.status || 'Pending')
        });
        console.log('✅ Workflow log created:', details);
    } catch (err) {
        console.error('❌ Error creating workflow entry:', err.message);
        throw err;
    }

    console.log('✅ Update complete for request:', updatedRequest.id);
    return updatedRequest;
}

    async function create(params, user) {
        console.log("🧾 Creating request by:", user);
        let { type, items, status, employeeId, approverId } = params;

        // ✅ Automatically use logged-in user's employeeId if role = User
        if (user?.role === 'User') {
            const employee = await db.Employee.findOne({
            where: { accountId: user.id }
            });
            if (!employee) throw new Error('Employee record not found for this user');
            employeeId = employee.id; // override
        }

        if (!employeeId) throw new Error('Employee is required');

        const employee = await db.Employee.findByPk(employeeId, {
            include: [{ model: db.Account, as: 'account' }]
        });
        if (!employee) throw new Error('Employee not found');

        if (employee.account?.status !== 'Active') {
            console.warn(`Creating request for inactive employee: ${employee.employeeId}`);
        }

        // ✅ Use passed status or default to 'Draft'
        const finalStatus = status || 'Draft';

        // 🟢 Create request
        const newRequest = await db.Request.create({
            type,
            items,
            status: finalStatus,
            employeeId: employee.id,
            approverId: approverId || null,
            createdByRole: user?.role || 'User'
        });

        // ✅ Only create workflow if submitted (status = Pending)
        if (finalStatus === 'Pending') {
            await db.Workflow.create({
            type: newRequest.type,
            details: `Review ${newRequest.type} request #${newRequest.id} from Employee ${employee.employeeId}`,
            employeeId: employee.id,
            requestId: newRequest.id,
            status: 'Pending'
            });

            console.log(`✅ Workflow created for submitted request #${newRequest.id}`);
        } else {
            console.log(`📝 Draft saved for Employee ${employee.employeeId}, not yet submitted.`);
        }

        console.log(`✅ Request #${newRequest.id} created by ${user?.role || 'User'}`);
        return await getById(newRequest.id);
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
