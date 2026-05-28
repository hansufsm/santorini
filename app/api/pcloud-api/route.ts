import { cookies } from "next/headers";
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

type PCloudListFolderResponse = {
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

type PCloudApiRequestBody = {
  sessionToken?: string;
  folderId?: string;
  folderPath?: string;
};

const DEFAULT_PCLOUD_API_HOST = "api.pcloud.com";
const MAX_CSV_FILES = 20;
const MAX_CSV_BYTES = 5 * 1024 * 1024;

function normalizePCloudHost(value: string | undefined | null) {
  const host = (value || DEFAULT_PCLOUD_API_HOST).trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!/^(api|eapi)\.pcloud\.com$/i.test(host)) {
    throw new Error("Host da API pCloud inválido. Use api.pcloud.com ou eapi.pcloud.com.");
  }
  return host.toLowerCase();
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

async function getPCloudConfiguration(body: PCloudApiRequestBody) {
  const cookieStore = await cookies();
  const accessToken = process.env.PCLOUD_ACCESS_TOKEN || cookieStore.get("pcloud_access_token")?.value || "";
  const apiHost = normalizePCloudHost(process.env.PCLOUD_API_HOST || cookieStore.get("pcloud_api_host")?.value);
  const folderId = (body.folderId || process.env.PCLOUD_FOLDER_ID || "").trim();
  const folderPath = (body.folderPath || process.env.PCLOUD_FOLDER_PATH || "").trim();

  if (!accessToken) {
    throw new Error("API pCloud não conectada. Autorize o app em /api/pcloud-oauth/start ou configure PCLOUD_ACCESS_TOKEN na Vercel.");
  }
  if (!folderId && !folderPath) {
    throw new Error("Informe o folderid da pasta pCloud ou configure PCLOUD_FOLDER_ID na Vercel.");
  }

  return { accessToken, apiHost, folderId, folderPath };
}

function appendAuth(url: URL, accessToken: string) {
  // A API pCloud documenta autenticação por token no parâmetro global `auth`.
  url.searchParams.set("auth", accessToken);
  return url;
}

export async function GET() {
  return NextResponse.json({ error: "Use POST com sessão administrativa para consultar a API pCloud." }, { status: 405 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as PCloudApiRequestBody;
    await assertAdministrativeSession(body.sessionToken ?? "");

    const { accessToken, apiHost, folderId, folderPath } = await getPCloudConfiguration(body);
    const apiBase = `https://${apiHost}`;

    const listFolderUrl = appendAuth(new URL(`${apiBase}/listfolder`), accessToken);
    listFolderUrl.searchParams.set("recursive", "1");
    if (folderId) listFolderUrl.searchParams.set("folderid", folderId);
    else listFolderUrl.searchParams.set("path", folderPath);

    const folder = await fetchJson<PCloudListFolderResponse>(listFolderUrl.toString());
    if (folder.result !== 0 || !folder.metadata) {
      return NextResponse.json({ error: folder.error ?? "Não foi possível listar a pasta pela API pCloud." }, { status: 400 });
    }

    const csvFiles = collectCsvFiles(folder.metadata).slice(0, MAX_CSV_FILES);
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

      const downloadInfoUrl = appendAuth(new URL(`${apiBase}/getfilelink`), accessToken);
      downloadInfoUrl.searchParams.set("fileid", String(file.fileid));
      downloadInfoUrl.searchParams.set("forcedownload", "1");
      const downloadInfo = await fetchJson<PCloudDownloadResponse>(downloadInfoUrl.toString());
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

    const sourceUrl = folderId ? `pcloud-api:folderid:${folderId}` : `pcloud-api:path:${folderPath}`;
    return NextResponse.json({
      sourceUrl,
      folderName: folder.metadata.name ?? "pCloud",
      fileCount: files.length,
      files,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao consultar API pCloud.";
    const status = message.includes("restrito") || message.includes("Sessão") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
