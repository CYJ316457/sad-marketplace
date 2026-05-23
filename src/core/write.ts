import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function sha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export function writeTextFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
}

export function removeFileIfExists(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  fs.rmSync(filePath, { force: true });
  return true;
}
