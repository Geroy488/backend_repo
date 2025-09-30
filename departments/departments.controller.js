// file: departments/departments.controller.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('_middleware/validate-request');
const authorize = require('_middleware/authorize');
const Role = require('_helpers/role');
const departmentService = require('./department.service');

// ===== Routes =====
router.get('/', /* authorize(Role.Admin), */ getAll);
router.get('/:id', authorize(), getById);
router.post('/', authorize(Role.Admin), createSchema, create);
router.put('/:id', authorize(Role.Admin), updateSchema, update);
router.delete('/:id', authorize(Role.Admin), _delete);

console.log("✅ Departments controller loaded");

module.exports = router;

// ===== Schemas =====
function createSchema(req, res, next) {
  const schema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().allow('', null)
  });
  validateRequest(req, next, schema);
}

function updateSchema(req, res, next) {
  const schema = Joi.object({
    name: Joi.string().empty(''),
    description: Joi.string().allow('', null).empty('')
  });
  validateRequest(req, next, schema);
}

// ===== Route Handlers =====
function getAll(req, res, next) {
  departmentService.getAll()
    .then(departments => res.json(departments))
    .catch(next);
}

function getById(req, res, next) {
  departmentService.getById(req.params.id)
    .then(dep => dep ? res.json(dep) : res.sendStatus(404))
    .catch(next);
}

function create(req, res, next) {
  departmentService.create(req.body)
    .then(dep => res.json(dep))
    .catch(next);
}

function update(req, res, next) {
  departmentService.update(req.params.id, req.body)
    .then(dep => res.json(dep))
    .catch(next);
}

function _delete(req, res, next) {
  // Hard delete — remove the department entirely
  // Or soft delete (if you want to keep data)
  departmentService.delete(req.params.id)
    .then(() => res.json({ message: 'Department deleted' }))
    .catch(next);
}
