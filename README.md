# Snake

Snake 是一个纯静态的滚动叙事页面，用视频、图片和文案介绍一只名叫 Snake 的小猫。页面入口是 `index.html`，素材集中放在 `assets/`，不依赖 Node.js 构建流程。

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
│   └── gpt-image2/         # 页面使用的猫咪图片
├── scripts/
│   ├── deploy.sh           # 打包并部署到远程服务器
│   └── install-git-hooks.sh
├── .githooks/
│   └── pre-push            # push 前自动部署
├── .env.deploy.example     # 部署配置模板
└── README.md
```

## 本地预览

这个项目没有构建步骤。需要预览时在项目根目录启动一个静态文件服务：

```bash
python3 -m http.server 5173
```

然后打开：

```text
http://localhost:5173
```

停止预览服务时，在启动服务的终端按 `Ctrl+C`。如果服务在后台运行，可以先找到进程再停止。

## 部署配置

复制部署配置模板：

```bash
cp .env.deploy.example .env.deploy.local
```

填写 `.env.deploy.local`：

| 变量 | 说明 |
| --- | --- |
| `DEPLOY_SSH_HOST` | 远程服务器公网 IP 或域名 |
| `DEPLOY_SSH_USER` | SSH 登录用户名 |
| `DEPLOY_SSH_PORT` | SSH 端口，通常是 `22` |
| `DEPLOY_SSH_KEY` | 本机 SSH 私钥路径 |
| `DEPLOY_REMOTE_DIR` | 远程部署目录 |

`.env.deploy.local` 包含服务器信息，已被 `.gitignore` 忽略，不要提交。

## 手动部署

部署脚本会把 `index.html` 和 `assets/` 打成 `.deploy/snake-static.tar.gz`，上传到远程服务器，再解压到 `DEPLOY_REMOTE_DIR`。

先做一次 dry run，确认打包内容和目标位置：

```bash
scripts/deploy.sh --dry-run
```

执行真实部署：

```bash
scripts/deploy.sh
```

## Push 前自动部署

仓库使用 `.githooks/pre-push` 作为 push 前钩子。安装钩子：

```bash
scripts/install-git-hooks.sh
```

安装后，每次执行 `git push` 都会先运行：

```bash
scripts/deploy.sh
```

部署成功后才会继续推送到远程 Git 仓库。如果某次只想推送代码、跳过部署，可以显式设置：

```bash
SKIP_DEPLOY_ON_PUSH=1 git push
```

## Git 远程仓库

目标远程仓库：

```text
https://github.com/SSDWGG/snake.git
```

首次初始化并推送：

```bash
git init -b main
git remote add origin https://github.com/SSDWGG/snake.git
scripts/install-git-hooks.sh
git add .
git commit -m "feat: add snake static site"
git push -u origin main
```

因为已经安装 pre-push 钩子，最后一步会先部署到远程服务器指定目录，再推送代码。
