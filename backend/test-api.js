const http = require('http');

const data = JSON.stringify({
  tenantId: "bf059d81-da83-4903-88bc-38bf228eb198", 
  cycleId: "b7e28b1e-b8d9-43c3-9d18-77c8e2390f7a", 
  name: "Joãozinho",
  role: "Analista",
  level: "Estagiário",
  email: "joaozinho@gmail.com",
  status: "ACTIVE",
  observations: "Qualquer coisa, é somente teste...",
  grossSalary: 3000,
  frontId: "c2c019d0-0fb8-4107-ac3e-56f8f1767e7c",
  subdivisionId: null,
  allocatedHours: 8,
  predictableRecurrentTimePercentage: 50,
  unpredictableRecurrentTimePercentage: 20,
  allocationStartDate: "2024-06-16",
  allocationEndDate: null
});

const options = {
  hostname: 'localhost',
  port: 3333,
  path: '/employees',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
