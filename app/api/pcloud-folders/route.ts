import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type PCloudMetadata = {
  name?: string;
  isfolder?: boolean;
  contents?: PCloudMetadata[];
  folderid?: number | string;
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

type ConvexRestResponse<T = unknown> = {
  status?: "success" | "error";
  value?: T;
  errorMessage?: string;
};

type PCloudFoldersRequestBody = {
  sessionToken?: string;
  rootFolderId?: string;
  rootPath?: string;
};

type PCloudFolderOption = {
  folderId: string;
  name: string;
  path: string;
  level: number;
  csvCount: number;
  directCsvCount: number;
  childFolderCount: number;
  modified?: string;
};

const DEFAULT_PCLOUD_API_HOST = "api.pcloud.com";
const MAX_FOLDER_OPTIONS = 300;

function normalizePCloudHost(value: string | undefined | null) {
  const host = (value || DEFAULT_PCLOUD_API_HOST).trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!/^(api|eapi)\.pcloud\.com$/i.test(host)) {
    throw new Error("Host da API pCloud inválido. Use api.pcloud.com ou eapi.pcloud.com.");
  }
  return host.toLowerCase();
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

async function getPCloudConfiguration() {
  const cookieStore = await cookies();
  const accessToken = process.env.PCLOUD_ACCESS_TOKEN || cookieStore.get("pcloud_access_token")?.value || "";
  const apiHost = normalizePCloudHost(process.env.PCLOUD_API_HOST || cookieStore.get("pcloud_api_host")?.value);

  if (!accessToken) {
    throw new Error("API pCloud não conectada. Autorize o app em /api/pcloud-oauth/start ou configure PCLOUD_ACCESS_TOKEN na Vercel.");
  }

  return { accessToken, apiHost };
}

function appendAuth(url: URL, accessToken: string) {
  url.searchParams.set("auth", accessToken);
  return url;
}

function countCsvFiles(metadata: PCloudMetadata | undefined): number {
  if (!metadata) return 0;
  if (!metadata.isfolder) {
    const name = metadata.name ?? "";
    const contentType = metadata.contenttype ?? "";
    return name.toLowerCase().endsWith(".csv") || contentType.includes("csv") ? 1 : 0;
  }
  return (metadata.contents ?? []).reduce((total, item) => total + countCsvFiles(item), 0);
}

function collectFolders(metadata: PCloudMetadata | undefined, options: PCloudFolderOption[] = [], level = 0) {
  if (!metadata?.isfolder) return options;
  if (options.length >= MAX_FOLDER_OPTIONS) return options;

  const contents = metadata.contents ?? [];
  const directCsvCount = contents.filter((item) => {
    if (item.isfolder) return false;
    const name = item.name ?? "";
    const contentType = item.contenttype ?? "";
    return name.toLowerCase().endsWith(".csv") || contentType.includes("csv");
  }).length;
  const childFolderCount = contents.filter((item) => item.isfolder).length;
  const folderId = metadata.folderid ?? (level === 0 ? 0 : undefined);

  if (folderId !== undefined && folderId !== null) {
    options.push({
      folderId: String(folderId),
      name: metadata.name ?? (level === 0 ? "Raiz pCloud" : `Pasta ${folderId}`),
      path: metadata.path ?? "/",
      level,
      csvCount: countCsvFiles(metadata),
      directCsvCount,
      childFolderCount,
      modified: metadata.modified,
    });
  }

  for (const item of contents) {
    if (item.isfolder) collectFolders(item, options, level + 1);
    if (options.length >= MAX_FOLDER_OPTIONS) break;
  }

  return options;
}

export async function GET() {
  return NextResponse.json({ error: "Use POST com sessão administrativa para listar pastas pCloud." }, { status: 405 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as PCloudFoldersRequestBody;
    await assertAdministrativeSession(body.sessionToken ?? "");

    const { accessToken, apiHost } = await getPCloudConfiguration();
    const listFolderUrl = appendAuth(new URL(`https://${apiHost}/listfolder`), accessToken);
    listFolderUrl.searchParams.set("recursive", "1");
    if (body.rootFolderId?.trim()) listFolderUrl.searchParams.set("folderid", body.rootFolderId.trim());
    else if (body.rootPath?.trim()) listFolderUrl.searchParams.set("path", body.rootPath.trim());
    else listFolderUrl.searchParams.set("folderid", "0");

    const folder = await fetchJson<PCloudListFolderResponse>(listFolderUrl.toString());
    if (folder.result !== 0 || !folder.metadata) {
      return NextResponse.json({ error: folder.error ?? "Não foi possível listar as pastas pela API pCloud." }, { status: 400 });
    }

    const folders = collectFolders(folder.metadata);
    const selectedFolderId = process.env.PCLOUD_FOLDER_ID || "";

    return NextResponse.json({
      sourceUrl: "pcloud-api:listfolder",
      rootFolderName: folder.metadata.name ?? "pCloud",
      folderCount: folders.length,
      truncated: folders.length >= MAX_FOLDER_OPTIONS,
      selectedFolderId,
      folders,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao listar pastas pCloud.";
    const status = message.includes("restrito") || message.includes("Sessão") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
