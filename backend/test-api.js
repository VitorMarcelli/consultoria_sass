const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eGNhcmZxcGRtbm5pcWZ3aGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyODE2MjUsImV4cCI6MjA5NTg1NzYyNX0.TSz1FUepCVy0RNg-q90QbMGoxZqpt5z0WBNVvZVrJG4';

fetch('http://localhost:3333/users/me', {
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  }
}).then(res => res.json()).then(console.log).catch(console.error);
