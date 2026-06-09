const fs = require("fs");
const path = require("path");

// Parser simples para CSV que lida com aspas e separadores
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const sep = lines[0].includes(";") ? ";" : ",";

  return lines.map((line) => {
    const fields = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === sep && !inQuotes) {
        fields.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    fields.push(cur.trim());
    return fields;
  });
}

// Formata campos com aspas se necessário (escapando aspas internas)
function escapeCSVField(field) {
  const str = String(field ?? "");
  if (str.includes(",") || str.includes(";") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function convertFile(inputPath, outputPath) {
  if (!fs.existsSync(inputPath)) {
    console.error(`Erro: Arquivo de entrada não encontrado: ${inputPath}`);
    return false;
  }

  const content = fs.readFileSync(inputPath, "utf-8");
  const rows = parseCSV(content);
  if (rows.length < 2) {
    console.error("Erro: Arquivo CSV vazio ou sem dados suficientes.");
    return false;
  }

  const headers = rows[0];
  const getIndex = (name) => {
    const idx = headers.findIndex((h) => h.toLowerCase().trim() === name.toLowerCase().trim());
    if (idx >= 0) return idx;
    return headers.findIndex((h) => h.toLowerCase().includes(name.toLowerCase()));
  };

  const idxDateTime = getIndex("data e hora");
  const idxType = getIndex("meio - meio") || getIndex("tipo");
  const idxName = getIndex("origem - nome") || getIndex("nome");
  const idxDetail = getIndex("tipo - origem") || getIndex("detalhe");
  const idxNetValue = getIndex("líquido (r$)") || getIndex("líquido");
  const idxGrossValue = getIndex("valor (r$)") || getIndex("valor");

  if (idxDateTime === -1 || (idxNetValue === -1 && idxGrossValue === -1)) {
    console.error("Erro: O arquivo não possui a estrutura esperada do novo formato do pCloud/InfinitePay.");
    console.log("Cabeçalhos detectados:", headers);
    return false;
  }

  const outputRows = [
    ["Data", "Hora", "Tipo de transação", "Nome", "Detalhe", "Valor"]
  ];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length < headers.length) continue;

    // 1. Processar Data e Hora (manter apenas data na coluna Data, Hora = 00:00:00)
    const rawDateTime = row[idxDateTime] ?? "";
    const [datePart] = rawDateTime.split(" ");
    let date = datePart;
    if (datePart && datePart.includes("/")) {
      const parts = datePart.split("/");
      if (parts.length === 3) {
        // Converte DD/MM/YYYY para YYYY-MM-DD
        date = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    const time = "00:00:00"; // Não precisa do horário operacional

    // 2. Tipo de transação
    const type = row[idxType] ?? "Pix";

    // 3. Nome do pagador
    const name = row[idxName] ?? "";

    // 4. Detalhe
    const detail = row[idxDetail] ?? "Loja Online";

    // 5. Valor (usar o Líquido por padrão)
    const rawValueStr = row[idxNetValue] !== undefined ? row[idxNetValue] : (row[idxGrossValue] ?? "0");
    // Limpar e formatar para o padrão "+R$ XX,XX"
    const cleanedValueStr = rawValueStr.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
    const val = parseFloat(cleanedValueStr);
    const formattedVal = isNaN(val) 
      ? `+R$ ${rawValueStr}` 
      : `${val >= 0 ? "+" : "-"}R$ ${Math.abs(val).toFixed(2).replace(".", ",")}`;

    outputRows.push([date, time, type, name, detail, formattedVal]);
  }

  const csvContent = outputRows
    .map((row) => row.map(escapeCSVField).join(","))
    .join("\n");

  fs.writeFileSync(outputPath, csvContent, "utf-8");
  console.log(`Sucesso! Arquivo convertido salvo em: ${outputPath}`);
  console.log(`Total de transações convertidas: ${outputRows.length - 1}`);
  return true;
}

// Execução CLI ou auto-detect
const args = process.argv.slice(2);
if (args.length > 0) {
  const input = args[0];
  const output = args[1] || `convertido_${path.basename(input)}`;
  convertFile(input, output);
} else {
  // Modo automático na pasta atual
  console.log("Nenhum arquivo especificado. Escaneando diretório por arquivos 'report_*.csv'...");
  const files = fs.readdirSync(".").filter(f => f.startsWith("report_") && f.endsWith(".csv"));
  if (files.length === 0) {
    console.log("Nenhum arquivo 'report_*.csv' encontrado na pasta atual.");
    console.log("Uso: node scripts/convert_extrato.js <arquivo_entrada.csv> [arquivo_saida.csv]");
  } else {
    files.forEach(f => {
      const output = `extrato_convertido_${f.replace("report_", "")}`;
      convertFile(f, output);
    });
  }
}
