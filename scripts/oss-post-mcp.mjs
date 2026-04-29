#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const serverInfo = {
  name: "snake-oss-post-mcp",
  version: "1.0.0",
};

const requiredEnv = [
  "OSS_POST_CDN_HOST",
  "OSS_POST_PREFIX",
  "OSS_POST_ACCESS_KEY_ID",
  "OSS_POST_POLICY",
  "OSS_POST_SIGNATURE",
];

function readConfig() {
  const missing = requiredEnv.filter((key) => !process.env[key] || process.env[key].startsWith("your-"));
  if (missing.length > 0) {
    throw new Error(`Missing required OSS POST env values: ${missing.join(", ")}`);
  }

  return {
    cdnHost: trimTrailingSlash(process.env.OSS_POST_CDN_HOST),
    prefix: trimSlashes(process.env.OSS_POST_PREFIX),
    accessKeyId: process.env.OSS_POST_ACCESS_KEY_ID,
    policy: process.env.OSS_POST_POLICY,
    signature: process.env.OSS_POST_SIGNATURE,
    successActionStatus: process.env.OSS_POST_SUCCESS_ACTION_STATUS || "200",
  };
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/g, "");
}

function trimSlashes(value) {
  return value.replace(/^\/+|\/+$/g, "");
}

function todayLocal() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function mimeTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".avif": "image/avif",
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".mp4": "video/mp4",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
  };
  return map[ext] || "application/octet-stream";
}

function extensionFor(filePath) {
  return path.extname(filePath).replace(/^\./, "").toLowerCase();
}

function encodeObjectKey(key) {
  return key.split("/").map((part) => encodeURIComponent(part)).join("/");
}

async function assertReadableFile(filePath) {
  const stat = await fs.stat(filePath);
  if (!stat.isFile()) {
    throw new Error(`Not a file: ${filePath}`);
  }
}

function buildObjectKey({ sourcePath, targetDir, fileName, date }) {
  const config = readConfig();
  const ext = extensionFor(sourcePath);
  if (!ext && !fileName) {
    throw new Error("Cannot infer file extension; pass fileName with an extension.");
  }

  const normalizedTargetDir = targetDir
    ? trimSlashes(targetDir)
    : `${config.prefix}/${date || todayLocal()}`;
  const generatedFileName = fileName || `${crypto.randomUUID()}.${ext}`;

  return `${normalizedTargetDir}/${generatedFileName}`.replace(/\/+/g, "/");
}

async function uploadToOss(args) {
  const filePath = args.filePath;
  if (!filePath || typeof filePath !== "string") {
    throw new Error("filePath is required.");
  }

  const sourcePath = path.resolve(filePath);
  await assertReadableFile(sourcePath);

  const config = readConfig();
  const objectKey = buildObjectKey({
    sourcePath,
    targetDir: args.targetDir,
    fileName: args.fileName,
    date: args.date,
  });

  const fileBuffer = await fs.readFile(sourcePath);
  const form = new FormData();
  form.append("key", objectKey);
  form.append("OSSAccessKeyId", config.accessKeyId);
  form.append("policy", config.policy);
  form.append("signature", config.signature);
  form.append("success_action_status", config.successActionStatus);
  form.append("file", new Blob([fileBuffer], { type: mimeTypeFor(sourcePath) }), path.basename(sourcePath));

  const response = await fetch(config.cdnHost, {
    method: "POST",
    body: form,
  });

  const responseText = await response.text();
  if (String(response.status) !== config.successActionStatus) {
    throw new Error(`OSS upload failed with HTTP ${response.status}: ${responseText.slice(0, 500)}`);
  }

  const url = `${config.cdnHost}/${encodeObjectKey(objectKey)}`;
  return {
    success: true,
    key: objectKey,
    url,
    status: response.status,
  };
}

function mask(value) {
  if (!value) return "";
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

function listOssConfigs() {
  const config = readConfig();
  return {
    mode: "post-policy",
    cdnHost: config.cdnHost,
    prefix: config.prefix,
    accessKeyId: mask(config.accessKeyId),
    successActionStatus: config.successActionStatus,
    tools: ["upload_to_oss", "list_oss_configs"],
  };
}

const tools = [
  {
    name: "upload_to_oss",
    description:
      "Upload a local file to OSS through the configured POST policy. By default it uses yunxiaoding-mini/other/wggw/YYYY-MM-DD/<uuid>.<ext>.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Absolute or project-relative path to the local file.",
        },
        targetDir: {
          type: "string",
          description:
            "Optional OSS directory. Defaults to OSS_POST_PREFIX plus today's YYYY-MM-DD folder.",
        },
        fileName: {
          type: "string",
          description: "Optional uploaded file name. Defaults to a random UUID plus the source extension.",
        },
        date: {
          type: "string",
          description: "Optional YYYY-MM-DD date folder used when targetDir is omitted.",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        },
        configName: {
          type: "string",
          description: "Accepted for compatibility; this POST policy server uses one local config.",
        },
      },
      required: ["filePath"],
      additionalProperties: false,
    },
  },
  {
    name: "list_oss_configs",
    description: "List the active OSS POST policy configuration without exposing secrets.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];

async function callTool(name, args = {}) {
  if (name === "upload_to_oss") {
    const result = await uploadToOss(args);
    return {
      content: [
        {
          type: "text",
          text: `Upload complete\nkey: ${result.key}\nurl: ${result.url}`,
        },
      ],
      structuredContent: result,
    };
  }

  if (name === "list_oss_configs") {
    const result = listOssConfigs();
    return {
      content: [
        {
          type: "text",
          text: `OSS POST policy config\nhost: ${result.cdnHost}\nprefix: ${result.prefix}\naccessKeyId: ${result.accessKeyId}`,
        },
      ],
      structuredContent: result,
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

function writeMessage(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function writeResult(id, result) {
  writeMessage({ jsonrpc: "2.0", id, result });
}

function writeError(id, error) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    error: {
      code: -32000,
      message: error instanceof Error ? error.message : String(error),
    },
  });
}

async function handleMessage(message) {
  if (message.method === "notifications/initialized") {
    return;
  }

  if (message.method === "initialize") {
    writeResult(message.id, {
      protocolVersion: message.params?.protocolVersion || "2024-11-05",
      capabilities: {
        tools: {},
      },
      serverInfo,
    });
    return;
  }

  if (message.method === "ping") {
    writeResult(message.id, {});
    return;
  }

  if (message.method === "tools/list") {
    writeResult(message.id, { tools });
    return;
  }

  if (message.method === "tools/call") {
    try {
      writeResult(message.id, await callTool(message.params?.name, message.params?.arguments || {}));
    } catch (error) {
      writeResult(message.id, {
        isError: true,
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : String(error),
          },
        ],
      });
    }
    return;
  }

  writeError(message.id, new Error(`Unsupported method: ${message.method}`));
}

let inputBuffer = "";

function processInputBuffer() {
  while (true) {
    if (inputBuffer.startsWith("Content-Length:")) {
      const headerEnd = inputBuffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) return;

      const header = inputBuffer.slice(0, headerEnd);
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        inputBuffer = inputBuffer.slice(headerEnd + 4);
        continue;
      }

      const length = Number(match[1]);
      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + length;
      if (inputBuffer.length < bodyEnd) return;

      const body = inputBuffer.slice(bodyStart, bodyEnd);
      inputBuffer = inputBuffer.slice(bodyEnd);
      void handleMessage(JSON.parse(body));
      continue;
    }

    const newlineIndex = inputBuffer.indexOf("\n");
    if (newlineIndex === -1) return;

    const line = inputBuffer.slice(0, newlineIndex).trim();
    inputBuffer = inputBuffer.slice(newlineIndex + 1);
    if (!line) continue;
    void handleMessage(JSON.parse(line));
  }
}

try {
  readConfig();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  inputBuffer += chunk;
  processInputBuffer();
});
