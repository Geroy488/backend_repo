// file: positions/positions.controller.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('_middleware/validate-request');
const authorize = require('_middleware/authorize');
const Role = require('_helpers/role');
const positionService = require('./position.service');

// ===== Routes =====
router.get('/', /* authorize(Role.Admin), */ getAll);
router.get('/:id', authorize(), getById);
router.post('/', authorize(Role.Admin), createSchema, create);
router.put('/:id', authorize(Role.Admin), updateSchema, update);
router.delete('/:id', authorize(Role.Admin), _delete);

console.log("✅ Positions controller loaded");

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
  positionService.getAll()
    .then(positions => res.json(positions))
    .catch(next);
}

function getById(req, res, next) {
  positionService.getById(req.params.id)
    .then(pos => pos ? res.json(pos) : res.sendStatus(404))
    .catch(next);
}

function create(req, res, next) {
  positionService.create(req.body)
    .then(pos => res.json(pos))
    .catch(next);
}

function update(req, res, next) {
  positionService.update(req.params.id, req.body)
    .then(pos => res.json(pos))
    .catch(next);
}

function _delete(req, res, next) {
  positionService.delete(req.params.id)
    .then(() => res.json({ message: 'Position deleted' }))
    .catch(next);
}
