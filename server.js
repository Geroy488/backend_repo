require('rootpath')();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const errorHandler = require('_middleware/error-handler');
const employeesController = require('./employees/employees.controller');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// allow cors requests from any origin and with credentials
app.use(cors({ origin: (origin, callback) => callback(null, true), credentials: true }));

// api routes
app.use('/accounts', require('./accounts/accounts.controller'));
app.use('/employees', require('./employees/employees.controller'));  // ✅ enable employees API
app.use('/requests', require('./requests/request.controller'));  // ✅ enable requests API
app.use('/workflows', require('./workflows/workflow.controller'));  // ✅ enable workflows API
app.use('/departments', require('./departments/departments.controller'));
app.use('/positions', require('./positions/positions.controller'));

// swagger docs route
app.use('/api-docs', require('_helpers/swagger'));

app.use(cors({
    origin: ['https://your-frontend-domain.com'], // or frontend dev URL
    credentials: true // ✅ allows sending cookies
}));

// global error handler
app.use(errorHandler);

// start server
const port = process.env.NODE_ENV === 'production' ? (process.env.PORT || 80) : 4000;
app.listen(port, () => console.log('Server listening on port ' + port));
