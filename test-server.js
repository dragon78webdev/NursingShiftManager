import express from 'express';
const app = express();

app.get('/', (req, res) => {
  res.send('Hello from test server!');
});

const port = 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Test server running on port ${port}`);
});