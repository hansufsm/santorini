import { NextRequest, NextResponse } from "next/server";

type PCloudMetadata = {
  name?: string;
  isfolder?: boolean;
  contents?: PCloudMetadata[];
  fileid?: number | string;
  hash?: number | string;
  size?: number;
  modified?: string;
  contenttype?: string;
  path?: string;
};

type PCloudShowPublicLinkResponse = {
  result: number;
  error?: string;
  metadata?: PCloudMetadata;
};

type PCloudDownloadResponse = {
  result: number;
  error?: string;
  hosts?: string[];
  path?: string;
};

type ConvexRestResponse<T = unknown> = {
  status?: "success" | "error";
  value?: T;
  errorMessage?: string;
};

const PCLOUD_API_BASE = "https://api.pcloud.com";
const MAX_CSV_FILES = 20;
const MAX_CSV_BYTES = 5 * 1024 * 1024;

function extractPublicLinkCode(rawValue: string) {
  const value = rawValue.trim();
  if (!value) return "";
  if (/^[A-Za-z0-9]+$/.test(value)) return value;

  try {
    const url = new URL(value);
    return url.searchParams.get("code") ?? "";
  } catch {
    const match = value.match(/[?&]code=([^&]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : "";
  }
}

function collectCsvFiles(metadata: PCloudMetadata | undefined, files: PCloudMetadata[] = []) {
  if (!metadata) return files;
  if (metadata.isfolder) {
    for (const item of metadata.contents ?? []) collectCsvFiles(item, files);
    return files;
  }

  const name = metadata.name ?? "";
  const contentType = metadata.contenttype ?? "";
  if (name.toLowerCase().endsWith(".csv") || contentType.includes("csv")) {
    files.push(metadata);
  }
  return files;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Falha HTTP ${response.status} ao acessar pCloud.`);
  }
  return await response.json() as T;
}

async function assertAdministrativeSession(sessionToken: string) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL não configurada.");
  if (!sessionToken) throw new Error("Sessão administrativa ausente.");

  const response = await fetch(`${convexUrl}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: "transactions:getPCloudImportFiles",
      args: { sessionToken },
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Não foi possível validar a sessão administrativa.");
  const payload = await response.json() as ConvexRestResponse;
  if (payload.status === "error" || payload.errorMessage) {
    throw new Error("Acesso restrito à diretoria/sysadmin.");
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST com sessão administrativa para consultar a pasta pCloud." }, { status: 405 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { url?: string; sessionToken?: string };
    await assertAdministrativeSession(body.sessionToken ?? "");

    const sourceUrl = body.url ?? "";
    const code = extractPublicLinkCode(sourceUrl);

    if (!code) {
      return NextResponse.json({ error: "Informe um link público pCloud com parâmetro code ou o código da pasta." }, { status: 400 });
    }

    const publicLinkUrl = `${PCLOUD_API_BASE}/showpublink?code=${encodeURIComponent(code)}`;
    const publicLink = await fetchJson<PCloudShowPublicLinkResponse>(publicLinkUrl);
    if (publicLink.result !== 0 || !publicLink.metadata) {
      return NextResponse.json({ error: publicLink.error ?? "Não foi possível ler a pasta pública do pCloud." }, { status: 400 });
    }

    const csvFiles = collectCsvFiles(publicLink.metadata).slice(0, MAX_CSV_FILES);
    const files = [];

    for (const file of csvFiles) {
      if (!file.fileid) continue;
      if (typeof file.size === "number" && file.size > MAX_CSV_BYTES) {
        files.push({
          fileId: String(file.fileid),
          fileName: file.name ?? `arquivo-${file.fileid}.csv`,
          fileHash: file.hash ? String(file.hash) : undefined,
          fileSize: file.size,
          modified: file.modified,
          content: "",
          skippedBySize: true,
        });
        continue;
      }

      const downloadInfoUrl = `${PCLOUD_API_BASE}/getpublinkdownload?code=${encodeURIComponent(code)}&fileid=${encodeURIComponent(String(file.fileid))}`;
      const downloadInfo = await fetchJson<PCloudDownloadResponse>(downloadInfoUrl);
      if (downloadInfo.result !== 0 || !downloadInfo.hosts?.length || !downloadInfo.path) {
        throw new Error(downloadInfo.error ?? `Não foi possível gerar download para ${file.name ?? file.fileid}.`);
      }

      const downloadUrl = `https://${downloadInfo.hosts[0]}${downloadInfo.path}`;
      const csvResponse = await fetch(downloadUrl, { cache: "no-store" });
      if (!csvResponse.ok) {
        throw new Error(`Falha HTTP ${csvResponse.status} ao baixar ${file.name ?? file.fileid}.`);
      }

      const contentLength = Number(csvResponse.headers.get("content-length") ?? 0);
      if (contentLength > MAX_CSV_BYTES) {
        throw new Error(`O arquivo ${file.name ?? file.fileid} excede o limite de 5 MB.`);
      }

      const content = await csvResponse.text();
      if (content.length > MAX_CSV_BYTES) {
        throw new Error(`O arquivo ${file.name ?? file.fileid} excede o limite de 5 MB.`);
      }

      files.push({
        fileId: String(file.fileid),
        fileName: file.name ?? `arquivo-${file.fileid}.csv`,
        fileHash: file.hash ? String(file.hash) : undefined,
        fileSize: file.size,
        modified: file.modified,
        content,
        skippedBySize: false,
      });
    }

    return NextResponse.json({
      sourceUrl,
      folderName: publicLink.metadata.name ?? "pCloud",
      fileCount: files.length,
      files,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao consultar pCloud.";
    const status = message.includes("restrito") || message.includes("Sessão") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
