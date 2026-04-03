const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// 1️⃣ 设置整个项目根目录为静态文件目录
app.use(express.static(__dirname));

// 2️⃣ 根目录访问显示 index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 3️⃣ 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});