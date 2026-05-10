# Snake

Snake 是一个纯静态的滚动叙事页面，用视频、图片和文案介绍一只名叫 Snake 的小猫。页面入口是 `index.html`，素材集中放在 `assets/`，不依赖 Node.js 构建流程。

## 预览地址

| 端点 | 地址 |
|------|------|
| VPS (HTTPS) | [https://snake.ssdwgg.site](https://snake.ssdwgg.site) |
| VPS (第二域名) | [http://snake.aiwgg.cn](http://snake.aiwgg.cn) |
| GitHub Pages | [https://ssdwgg.github.io/snake/](https://ssdwgg.github.io/snake/) |

## 功能

- 滚动驱动视频进度，形成 scrollytelling 体验。
- 使用 intro、main-scroll、outro 三段视频切换页面状态。
- 通过图片网格展示 Snake 的姿态和小物件。
- 支持桌面端和移动端响应式布局。

## 项目结构

```text
.
├── index.html              # 静态页面入口
├── assets/                 # 图片和视频素材
│   ├── video/              # 页面使用的视频
│   ├── gpt-image2/         # 页面使用的猫咪图片
│   └── optimized/          # 优化后的图片
├── .github/workflows/      # CI/CD 工作流
│   └── deploy.yml          # 推送后自动部署到 VPS + GitHub Pages
├── .nojekyll               # GitHub Pages 关闭 Jekyll 处理
└── README.md
```

## 本地预览

```bash
python3 -m http.server 5173
# 打开 http://localhost:5173
```

## 三端部署架构

每次推送 `main` 分支后，GitHub Actions 自动完成：

```
git push origin main
       │
       ▼
  GitHub Actions
       │
       ├─── Job 1: deploy-vps
       │    ├── checkout 代码
       │    ├── rsync → VPS /www/wwwroot/ryw-yun-project/snake/
       │    └── chown www:www 修复权限
       │
       └─── Job 2: deploy-ghpages
            ├── checkout 代码
            ├── cp index.html 404.html
            └── 发布到 gh-pages 分支
```

### 部署端点详情

| 端点 | 域名 | HTTPS | 说明 |
|------|------|-------|------|
| VPS 主域名 | snake.ssdwgg.site | Let's Encrypt 自动续期 | 宝塔面板 Nginx |
| VPS 第二域名 | snake.aiwgg.cn | 待配置 | DNSPod DNS，需 API 凭据签发证书 |
| GitHub Pages | ssdwgg.github.io/snake | GitHub 自带 | gh-pages 分支自动发布 |

### 服务器信息

- VPS: 124.223.119.218 (OpenCloudOS 9.4)
- 部署路径: `/www/wwwroot/ryw-yun-project/snake/`
- Nginx: 宝塔面板，配置 `/www/server/panel/vhost/nginx/snake.conf`
