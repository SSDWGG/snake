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
│   ├── oss-mcp.sh          # 启动 OSS MCP 上传服务
│   └── oss-post-mcp.mjs    # OSS POST policy MCP 服务
├── .env.oss.example        # OSS MCP 配置模板
├── .nojekyll               # GitHub Pages 关闭 Jekyll 处理
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

## GitHub Pages 托管

本项目可以直接用 GitHub Pages 从 `main` 分支根目录发布，不需要构建步骤。仓库已包含 `.nojekyll`，用于关闭 Jekyll 处理，确保静态资源按原路径发布。

Pages 发布源：

```text
Branch: main
Folder: / (root)
```

启用后访问：

```text
https://ssdwgg.github.io/snake/
```

## OSS MCP 上传配置

项目已提供 `scripts/oss-mcp.sh` 作为 Codex MCP 启动器。它会读取 `.env.oss.local`，也可以通过 `OSS_MCP_ENV_FILE` 指定其他本地 OSS 配置文件。

这套配置使用现有小程序上传函数里的 POST policy 直传方式：

```text
cdnHost: https://panshi-on.meipingmi.com.cn
ossFilePrePath: /yunxiaoding-mini/other/wggw
```

复制 OSS 配置模板：

```bash
cp .env.oss.example .env.oss.local
```

填写 `.env.oss.local`：

| 变量 | 说明 |
| --- | --- |
| `OSS_POST_CDN_HOST` | 上传接口域名，对应函数里的 `cdnHost` |
| `OSS_POST_PREFIX` | 上传路径前缀，对应函数里的 `ossFilePrePath`，不要以 `/` 开头 |
| `OSS_POST_ACCESS_KEY_ID` | POST policy 使用的 OSS AccessKeyId |
| `OSS_POST_POLICY` | POST policy |
| `OSS_POST_SIGNATURE` | POST policy 签名 |
| `OSS_POST_SUCCESS_ACTION_STATUS` | 成功上传时期望的状态码，当前为 `200` |

Codex 的全局 MCP 配置已注册 `oss` server，重启 Codex 后可使用：

```text
upload_to_oss(filePath, targetDir, fileName, configName)
list_oss_configs()
```

默认上传路径与原函数一致，会生成：

```text
yunxiaoding-mini/other/wggw/YYYY-MM-DD/<uuid>.<ext>
```

示例：把 `assets/optimized/snake-01.jpg` 按默认规则上传：

```text
filePath: /Users/renshuaiweidemac/Desktop/localhostProject/snake/assets/optimized/snake-01.jpg
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
git add .
git commit -m "feat: add snake static site"
git push -u origin main
```
