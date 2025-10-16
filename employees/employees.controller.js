    // file: employees/employees.controller.js
    const express = require('express');
    const router = express.Router();
    const Joi = require('joi');
    const validateRequest = require('_middleware/validate-request');
    const authorize = require('_middleware/authorize');
    const Role = require('_helpers/role');
    const employeeService = require('./employee.service');

    // routes
    router.get('/', /* authorize(Role.Admin), */ getAll);
    router.get('/next-id', getNextEmployeeId);  // ✅ put here
    router.get('/:id', authorize(), getById);
    router.post('/', authorize(Role.Admin), createSchema, create);
    router.put('/:id', authorize(Role.Admin), updateSchema, update);
    router.delete('/:id', authorize(Role.Admin), _delete);
    
    console.log("✅ Employees controller loaded");

    module.exports = router;
   
    const currentYear = new Date().getFullYear();

    // ===== Schemas =====
    function createSchema(req, res, next) {
        const schema = Joi.object({
        accountId: Joi.number().required(),
        positionId: Joi.number().optional(),
        position: Joi.string().required(),
        department: Joi.string().required(),
        departmentId: Joi.number().optional(),  
        hireDate: Joi.date()
            .required()
            .max(new Date(`${currentYear}-12-31`)) // ❌ prevent future years
            .messages({
                "date.max": `Hire Date cannot be in a future year beyond ${currentYear}`
            }),
        status: Joi.string().valid('Active', 'Inactive').default('Active')
    });
        validateRequest(req, next, schema);
    }

    function updateSchema(req, res, next) {
    const schema = Joi.object({
    accountId: Joi.number().empty(''),
    positionId: Joi.number().optional(),
    position: Joi.string().empty(''),
    department: Joi.string().empty(''),         // still allowed by name
    departmentId: Joi.number().integer().optional(), // <-- allow ID
    hireDate: Joi.date()
      .empty('')
      .max(new Date(`${currentYear}-12-31`))
      .messages({
        "date.max": `Hire Date cannot be in a future year beyond ${currentYear}`
      }),
    status: Joi.string().valid('Active', 'Inactive').empty('')
  });
  validateRequest(req, next, schema);
}

    // ===== Route Handlers =====
    async function getAll(req, res) {
    const employees = await db.Employee.findAll({
        include: [{
        model: db.Account,
        as: 'account',
        attributes: ['id', 'email', 'firstName', 'lastName', 'role']
        }]
    });
    res.json(employees);
    }


    function getById(req, res, next) {
        employeeService.getById(req.params.id)
            .then(employee => employee ? res.json(employee) : res.sendStatus(404))
            .catch(next);
    }

    function getNextEmployeeId(req, res, next) {
    employeeService.getNextEmployeeId()
        .then(nextId => res.json({ nextId }))
        .catch(next);
    }

    function create(req, res, next) {
        console.log('Incoming payload:', req.body);   // 👈 add here
        employeeService.create(req.body)
            .then(employee => res.json(employee))
            .catch(next);
    }

    function update(req, res, next) {
        employeeService.update(req.params.id, req.body)
            .then(employee => res.json(employee))
            .catch(next);
    }

    function _delete(req, res, next) {
    employeeService.deactivate(req.params.id)
        .then(employee => res.json({ message: 'Employee deactivated', employee }))
        .catch(next);
    }


