import { ensureDir, exists } from "https://deno.land/std@0.203.0/fs/mod.ts";
import { join } from "https://deno.land/std@0.203.0/path/mod.ts";

type Version = { base: number; uid: string };

const BASE_DIR = "./storage";

const jsonHeaders = {
    "Content-Type": "application/json",
};

const logs: { time: string; type: "download" | "upload"; dir: string; version: Version }[] = [];

async function getVersion(dir: string): Promise<Version> {
    const versionFilePath = join(BASE_DIR, dir, ".version");
    if (await exists(versionFilePath)) {
        const versionContent = await Deno.readTextFile(versionFilePath);
        try {
            return JSON.parse(versionContent);
        } catch (error) {
            return { base: -1, uid: "" };
        }
    }
    return { base: -1, uid: "" };
}
async function setVersion(dir: string, version: Version): Promise<void> {
    const versionFilePath = join(BASE_DIR, dir, ".version");
    await Deno.writeTextFile(versionFilePath, JSON.stringify(version));
}

function checkVersion(beforeVersion: Version, newVersion: Version) {
    if (beforeVersion.base < newVersion.base) {
        return "newer";
    }
    if (beforeVersion.base > newVersion.base) {
        return "older";
    }
    if (beforeVersion.base === newVersion.base) {
        if (beforeVersion.uid === newVersion.uid) {
            return "same";
        }
        return "conflict";
    }
}

function getFilePath(dir: string, filename: string) {
    return join(BASE_DIR, dir, filename);
}

async function getFile(dir: string, filename: string): Promise<string | null> {
    const filePath = getFilePath(dir, filename);
    if (await exists(filePath)) {
        return await Deno.readTextFile(filePath);
    }
    return null;
}

async function setFile(dir: string, filename: string, data: string): Promise<void> {
    const filePath = getFilePath(dir, filename);
    ensureDir(join(BASE_DIR, dir));
    await Deno.writeTextFile(filePath, data);
}

function addLog(t: "download" | "upload", dir: string, version: Version) {
    console.log(`${new Date().toLocaleString()}  ${t} ${dir}    ${version.base} ${version.uid}`);
    logs.push({
        time: new Date().toLocaleString(),
        type: t,
        dir,
        version,
    });
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method === "POST") {
        try {
            const { action, dir, filename, data, version } = (await req.json()) as {
                action: "upload" | "download";
                dir: string;
                filename: string;
                data: string;
                version: { base: number; uid: string };
            };
            if (!action || !dir || !filename) {
                return new Response("Invalid JSON payload", { status: 400 });
            }

            if (action === "upload") {
                if (!data) {
                    return new Response("Missing file data for upload", { status: 400 });
                }

                const oldVersion = await getVersion(dir);

                const versionType = checkVersion(oldVersion, version);

                const returnJson = { type: versionType };

                const returnResponse = new Response(JSON.stringify(returnJson), { status: 200, headers: jsonHeaders });

                if (versionType === "same") {
                    return returnResponse;
                }

                if (versionType === "newer") {
                    await setFile(dir, filename, data);

                    await setVersion(dir, version);

                    addLog("upload", dir, version);

                    return returnResponse;
                }

                if (versionType === "older") {
                    return returnResponse;
                }

                if (versionType === "conflict") {
                    return returnResponse;
                }
            }
            if (action === "download") {
                const webVersion = await getVersion(dir);

                const returnResponse = (data: string | null) =>
                    new Response(JSON.stringify({ data: data, version: webVersion, type: versionType }), {
                        status: 200,
                        headers: jsonHeaders,
                    });

                const versionType = checkVersion(version, webVersion);
                if (versionType === "newer") {
                    const fileContent = await getFile(dir, filename);
                    if (fileContent !== null) {
                        addLog("download", dir, webVersion);

                        return returnResponse(fileContent);
                    }
                    return new Response("File not found", { status: 404 });
                }
                if (versionType === "conflict") {
                    return returnResponse(null);
                }
                return returnResponse(null);
            }
            return new Response("Invalid action", { status: 400 });
        } catch (err) {
            console.error("Error processing request:", err);
            return new Response("Invalid request", { status: 400 });
        }
    } else if (req.method === "GET") {
        const dirs = await Promise.all(
            Deno.readDirSync(BASE_DIR)
                .filter((i) => i.name !== ".git")
                .map(async (file) => ({ name: file.name, version: await getVersion(file.name) })),
        );

        return new Response(
            `Server is running\n\n${dirs
                .map((i) => `${i.name}    ${i.version.base} ${i.version.uid}`)
                .join(
                    "\n",
                )}\n\n${logs.map((i) => `${i.time}  ${i.type} ${i.dir}    ${i.version.base} ${i.version.uid}`).join("\n")}`,
            { status: 200 },
        );
    } else {
        return new Response("Method not allowed", { status: 405 });
    }
};

// Ensure the base directory exists
await ensureDir(BASE_DIR);

console.log("File storage server is running on https://localhost:8000");
Deno.serve(
    { port: 8000, cert: Deno.readTextFileSync("cert.pem"), key: Deno.readTextFileSync("key.pem") },
    async (req) => {
        const response = await handler(req);
        response.headers.set("Access-Control-Allow-Origin", "*");
        // response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        return response;
    },
);

if (await exists(join(BASE_DIR, ".git"))) {
    // 定时提交
    console.log("Git auto commit every 3 hours");

    let lastHour = -1;
    setInterval(
        async () => {
            if (new Date().getHours() % 3 === 0 && new Date().getHours() !== lastHour) {
                lastHour = new Date().getHours();
                const gitAdd = new Deno.Command("git", {
                    args: ["add", "."],
                    cwd: BASE_DIR,
                });
                const gitCommit = new Deno.Command("git", {
                    args: ["commit", "-m", "auto commit"],
                    cwd: BASE_DIR,
                });

                await gitAdd.output();
                try {
                    await gitCommit.output();
                    console.log("Auto commit");
                } catch (error) {
                    console.error("Auto commit error:", error);
                }
            }
        },
        1000 * 60 * 5,
    );
}
