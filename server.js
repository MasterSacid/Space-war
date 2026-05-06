const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const rootDir = __dirname;
const mapsDir = path.join(rootDir, "maps");
const port = Number(process.env.PORT || process.argv[2] || 8000);

const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".css": "text/css; charset=utf-8",
    ".txt": "text/plain; charset=utf-8"
};

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
    res.writeHead(status, { "Content-Type": contentType });
    res.end(body);
}

function sendJson(res, status, data) {
    send(res, status, JSON.stringify(data, null, 2), "application/json; charset=utf-8");
}

function getSafeMapFile(rawFile) {
    const file = decodeURIComponent(rawFile);

    if (!/^[a-zA-Z0-9_-]+\.json$/.test(file)) {
        return null;
    }

    return file;
}

async function readRequestBody(req) {
    const chunks = [];
    let size = 0;

    for await (const chunk of req) {
        size += chunk.length;
        if (size > 1024 * 1024) {
            throw new Error("Request body is too large");
        }
        chunks.push(chunk);
    }

    return Buffer.concat(chunks).toString("utf8");
}

async function listMaps() {
    const namesByFile = new Map();
    try {
        const manifest = JSON.parse(await fs.readFile(path.join(mapsDir, "index.json"), "utf8"));
        for (const map of manifest.maps ?? []) {
            if (map.file && map.name) {
                namesByFile.set(map.file, map.name);
            }
        }
    } catch (error) {
    }

    const entries = await fs.readdir(mapsDir, { withFileTypes: true });
    const maps = entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((file) => file !== "index.json" && /^[a-zA-Z0-9_-]+\.json$/.test(file))
        .sort()
        .map((file) => ({
            name: namesByFile.get(file) ?? file.replace(/\.json$/i, ""),
            file
        }));

    return { maps };
}

async function handleApi(req, res, url) {
    if (url.pathname === "/api/maps" && req.method === "GET") {
        sendJson(res, 200, await listMaps());
        return true;
    }

    const mapMatch = url.pathname.match(/^\/api\/maps\/([^/]+)$/);
    if (!mapMatch) return false;

    const file = getSafeMapFile(mapMatch[1]);
    if (!file) {
        sendJson(res, 400, { error: "Invalid map file name" });
        return true;
    }

    const filePath = path.join(mapsDir, file);

    if (req.method === "GET") {
        try {
            const json = await fs.readFile(filePath, "utf8");
            send(res, 200, json, "application/json; charset=utf-8");
        } catch (error) {
            sendJson(res, 404, { error: "Map not found" });
        }
        return true;
    }

    if (req.method === "PUT" || req.method === "POST") {
        try {
            const body = await readRequestBody(req);
            const data = JSON.parse(body);
            data.file = file;
            data.savedAt = new Date().toISOString();

            await fs.mkdir(mapsDir, { recursive: true });
            await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
            sendJson(res, 200, { ok: true, file });
        } catch (error) {
            sendJson(res, 400, { error: "Map could not be saved" });
        }
        return true;
    }

    sendJson(res, 405, { error: "Method not allowed" });
    return true;
}

async function serveStatic(req, res, url) {
    const requestPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const decodedPath = decodeURIComponent(requestPath);
    const filePath = path.normalize(path.join(rootDir, decodedPath));

    if (!filePath.startsWith(rootDir)) {
        send(res, 403, "Forbidden");
        return;
    }

    try {
        const data = await fs.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
            "Content-Type": mimeTypes[ext] ?? "application/octet-stream"
        });
        if (req.method === "HEAD") {
            res.end();
        } else {
            res.end(data);
        }
    } catch (error) {
        send(res, 404, "Not found");
    }
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    try {
        if (await handleApi(req, res, url)) return;
        await serveStatic(req, res, url);
    } catch (error) {
        sendJson(res, 500, { error: "Server error" });
    }
});

server.listen(port, "127.0.0.1", () => {
    console.log(`Space War dev server: http://127.0.0.1:${port}/`);
});
