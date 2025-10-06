import app from './app';

const port = Number(process.env.PORT || 4000);

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Zpoto API running on http://0.0.0.0:${port}`);
  console.log(`📱 Mobile can connect via: http://10.0.0.23:${port}`);
});
