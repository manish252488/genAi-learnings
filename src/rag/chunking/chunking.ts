/**
 * HTML DOM-aware chunking for the portfolio RAG knowledge base.
 * Prefers semantic cards (.experience-item / .project-item / .service-item),
 * splits oversized cards on h4, and prefixes every chunk with a breadcrumb.
 */
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import * as cheerio from "cheerio";

type DomNode = any;
type DomElement = any;

const SOFT_MAX = 1200;
const HARD_MAX = 1500;
const MIN_CHUNK = 100;
const MIN_BODY = 60;
const FALLBACK_OVERLAP = 150;

type ContentType =
  | "experience"
  | "project"
  | "skills"
  | "recruiter"
  | "behavioral"
  | "profile"
  | "services"
  | "general";

function mapContentType(sectionTitle: string): ContentType {
  const t = sectionTitle.toLowerCase();
  if (t.includes("work experience")) return "experience";
  if (t.includes("personal projects") || t.includes("companies & projects")) {
    return "project";
  }
  if (t.includes("technical skills") || (t.includes("skills") && !t.includes("recruiter"))) {
    return "skills";
  }
  if (t.includes("behavioral")) return "behavioral";
  if (t.includes("services")) return "services";
  if (
    t.includes("personal information") ||
    t.includes("quick reference") ||
    t.includes("professional summary")
  ) {
    return "profile";
  }
  if (t.includes("recruiter")) return "recruiter";
  if (t.includes("project")) return "project";
  return "general";
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function elementText($: cheerio.CheerioAPI, el: DomNode): string {
  const clone = $(el).clone();
  clone.find("script, style, noscript").remove();
  // Convert tech tags to readable comma-ish list
  clone.find(".tech-tag").each((_, tag) => {
    const $tag = $(tag);
    $tag.replaceWith(` ${$tag.text().trim()} `);
  });
  return normalizeText(clone.text());
}

function buildBreadcrumb(sectionTitle: string, itemTitle?: string, subTitle?: string): string {
  const parts = [sectionTitle, itemTitle, subTitle].filter(Boolean) as string[];
  return parts.join(" > ");
}

function formatChunk(breadcrumb: string, body: string): string {
  const cleaned = normalizeText(body);
  if (!cleaned) return "";
  return `[${breadcrumb}]\n${cleaned}`;
}

function isMeaningfulChunk(chunkText: string): boolean {
  const body = chunkText.replace(/^\[[^\]]+\]\s*/u, "").trim();
  if (body.length < MIN_BODY) return false;
  // Drop stubs that are only a repeated heading
  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 1 && lines[0].length < 80) return false;
  return chunkText.length >= MIN_CHUNK;
}

async function splitOversized(
  text: string,
  maxSize: number
): Promise<string[]> {
  if (text.length <= maxSize) return [text];
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: maxSize,
    chunkOverlap: FALLBACK_OVERLAP,
    separators: ["\n\n", "\n", ". ", " ", ""],
    keepSeparator: true,
  });
  return splitter.splitText(text);
}

interface RawChunk {
  text: string;
  sectionTitle: string;
  itemTitle: string;
  breadcrumb: string;
  contentType: ContentType;
  sectionLevel: number;
}

async function chunkCard(
  $: cheerio.CheerioAPI,
  card: DomElement,
  sectionTitle: string,
  contentType: ContentType
): Promise<RawChunk[]> {
  const $card = $(card);
  const itemTitle = normalizeText($card.find("h3").first().text()) || sectionTitle;
  const breadcrumbBase = buildBreadcrumb(sectionTitle, itemTitle);
  const h4s = $card.find("h4").toArray() as DomElement[];

  // Small enough → one chunk
  const fullText = elementText($, card);
  if (fullText.length <= SOFT_MAX || h4s.length === 0) {
    const pieces = await splitOversized(
      formatChunk(breadcrumbBase, fullText),
      HARD_MAX
    );
    return pieces.map((text) => ({
      text,
      sectionTitle,
      itemTitle,
      breadcrumb: breadcrumbBase,
      contentType,
      sectionLevel: 2,
    }));
  }

  // Split on h4 subsections; include intro before first h4
  const chunks: RawChunk[] = [];
  const introNodes: DomNode[] = [];
  let pastFirstH4 = false;

  const children = $card.contents().toArray();
  let buffer: DomNode[] = [];
  let currentH4 = "";

  const flush = async (subTitle: string, nodes: DomNode[]) => {
    if (nodes.length === 0) return;
    const wrapper = $("<div></div>");
    for (const n of nodes) {
      wrapper.append($(n).clone());
    }
    const body = normalizeText(wrapper.text());
    if (!body) return;
    const breadcrumb = subTitle
      ? buildBreadcrumb(sectionTitle, itemTitle, subTitle)
      : breadcrumbBase;
    const formatted = formatChunk(breadcrumb, body);
    const pieces = await splitOversized(formatted, HARD_MAX);
    for (const text of pieces) {
      chunks.push({
        text,
        sectionTitle,
        itemTitle,
        breadcrumb,
        contentType,
        sectionLevel: subTitle ? 3 : 2,
      });
    }
  };

  for (const child of children) {
    if (child.type === "tag" && (child as DomElement).name === "h3") {
      // skip main title; breadcrumb already has it
      continue;
    }
    if (child.type === "tag" && (child as DomElement).name === "h4") {
      if (!pastFirstH4 && introNodes.length > 0) {
        await flush("", introNodes);
        introNodes.length = 0;
      } else if (pastFirstH4) {
        await flush(currentH4, buffer);
        buffer = [];
      }
      pastFirstH4 = true;
      currentH4 = normalizeText($(child).text());
      continue;
    }
    if (!pastFirstH4) {
      introNodes.push(child);
    } else {
      buffer.push(child);
    }
  }

  if (!pastFirstH4) {
    await flush("", [...introNodes, ...buffer].length ? [...introNodes, ...buffer] : children);
  } else {
    if (introNodes.length > 0) await flush("", introNodes);
    await flush(currentH4, buffer);
  }

  return chunks;
}

async function chunkLooseH3Blocks(
  $: cheerio.CheerioAPI,
  section: DomElement,
  sectionTitle: string,
  contentType: ContentType
): Promise<RawChunk[]> {
  const $section = $(section);
  const chunks: RawChunk[] = [];
  const h3s = $section.children("h3").toArray() as DomElement[];

  // Leading content before first h3 (e.g. summary paragraph)
  const leading: DomNode[] = [];
  for (const child of $section.contents().toArray()) {
    if (child.type === "tag" && (child as DomElement).name === "h2") continue;
    if (child.type === "tag" && (child as DomElement).name === "h3") break;
    if (
      child.type === "tag" &&
      ["div", "section"].includes((child as DomElement).name) &&
      ($(child).hasClass("experience-item") ||
        $(child).hasClass("project-item") ||
        $(child).hasClass("service-item"))
    ) {
      break;
    }
    leading.push(child);
  }

  if (leading.length > 0) {
    const wrapper = $("<div></div>");
    for (const n of leading) wrapper.append($(n).clone());
    const body = normalizeText(wrapper.text());
    if (body.length >= MIN_CHUNK) {
      const breadcrumb = buildBreadcrumb(sectionTitle);
      const pieces = await splitOversized(formatChunk(breadcrumb, body), HARD_MAX);
      for (const text of pieces) {
        chunks.push({
          text,
          sectionTitle,
          itemTitle: sectionTitle,
          breadcrumb,
          contentType,
          sectionLevel: 1,
        });
      }
    }
  }

  for (const h3 of h3s) {
    const itemTitle = normalizeText($(h3).text()) || "Subsection";
    const blockNodes: DomNode[] = [h3];
    let sibling = h3.nextSibling;
    while (sibling) {
      if (sibling.type === "tag") {
        const name = (sibling as DomElement).name;
        if (name === "h2" || name === "h3") break;
        if (
          ["div"].includes(name) &&
          ($(sibling).hasClass("experience-item") ||
            $(sibling).hasClass("project-item") ||
            $(sibling).hasClass("service-item"))
        ) {
          break;
        }
      }
      blockNodes.push(sibling);
      sibling = sibling.nextSibling;
    }
    const wrapper = $("<div></div>");
    for (const n of blockNodes) wrapper.append($(n).clone());
    const body = normalizeText(wrapper.text());
    if (!body) continue;
    const breadcrumb = buildBreadcrumb(sectionTitle, itemTitle);
    const pieces = await splitOversized(formatChunk(breadcrumb, body), HARD_MAX);
    for (const text of pieces) {
      chunks.push({
        text,
        sectionTitle,
        itemTitle,
        breadcrumb,
        contentType,
        sectionLevel: 2,
      });
    }
  }

  return chunks;
}

async function chunkHtmlDocument(
  html: string,
  baseMeta: Record<string, unknown>
): Promise<Document[]> {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();

  const sections = $("section.section").toArray() as DomElement[];
  const rawChunks: RawChunk[] = [];

  if (sections.length === 0) {
    // Fallback: whole body text
    const body = normalizeText($("body").text() || $.root().text());
    const pieces = await splitOversized(body, HARD_MAX);
    return pieces.map(
      (text, i) =>
        new Document({
          pageContent: text,
          metadata: {
            ...baseMeta,
            chunkIndex: i,
            chunkLength: text.length,
            sectionTitle: "",
            itemTitle: "",
            breadcrumb: "",
            contentType: "general",
            sectionLevel: 0,
          },
        })
    );
  }

  for (const section of sections) {
    const $section = $(section);
    const sectionTitle =
      normalizeText($section.find("h2").first().text()) || "Section";
    const contentType = mapContentType(sectionTitle);

    const cards = $section
      .find(".experience-item, .project-item, .service-item")
      .toArray() as DomElement[];

    if (cards.length > 0) {
      // Section intro (h2 + any prose before first card)
      const introNodes: DomNode[] = [];
      for (const child of $section.contents().toArray()) {
        if (
          child.type === "tag" &&
          ($(child).hasClass("experience-item") ||
            $(child).hasClass("project-item") ||
            $(child).hasClass("service-item") ||
            $(child).find(".experience-item, .project-item, .service-item").length > 0)
        ) {
          break;
        }
        if (child.type === "tag" && (child as DomElement).name === "h2") continue;
        introNodes.push(child);
      }
      if (introNodes.length > 0) {
        const wrapper = $("<div></div>");
        for (const n of introNodes) wrapper.append($(n).clone());
        const body = normalizeText(wrapper.text());
        if (body.length >= MIN_CHUNK) {
          const breadcrumb = buildBreadcrumb(sectionTitle);
          const pieces = await splitOversized(
            formatChunk(breadcrumb, body),
            HARD_MAX
          );
          for (const text of pieces) {
            rawChunks.push({
              text,
              sectionTitle,
              itemTitle: sectionTitle,
              breadcrumb,
              contentType,
              sectionLevel: 1,
            });
          }
        }
      }

      for (const card of cards) {
        const cardChunks = await chunkCard($, card, sectionTitle, contentType);
        rawChunks.push(...cardChunks);
      }
    } else {
      const loose = await chunkLooseH3Blocks($, section, sectionTitle, contentType);
      if (loose.length > 0) {
        rawChunks.push(...loose);
      } else {
        const body = elementText($, section);
        if (body.length >= MIN_CHUNK) {
          const breadcrumb = buildBreadcrumb(sectionTitle);
          const pieces = await splitOversized(
            formatChunk(breadcrumb, body),
            HARD_MAX
          );
          for (const text of pieces) {
            rawChunks.push({
              text,
              sectionTitle,
              itemTitle: sectionTitle,
              breadcrumb,
              contentType,
              sectionLevel: 1,
            });
          }
        }
      }
    }
  }

  return rawChunks
    .filter((c) => isMeaningfulChunk(c.text))
    .map((c, i, arr) =>
      new Document({
        pageContent: c.text,
        metadata: {
          ...baseMeta,
          chunkIndex: i,
          chunkInDocument: i + 1,
          totalChunksInDocument: arr.length,
          chunkLength: c.text.length,
          sectionTitle: c.sectionTitle,
          itemTitle: c.itemTitle,
          breadcrumb: c.breadcrumb,
          contentType: c.contentType,
          sectionLevel: c.sectionLevel,
          source: baseMeta.source || baseMeta.url || "unknown",
        },
      })
    );
}

export const splitDocuments = async (documents: Document[]) => {
  const processedDocs: Document[] = [];

  for (let docIndex = 0; docIndex < documents.length; docIndex++) {
    const doc = documents[docIndex];
    const content = doc.pageContent || "";
    const looksLikeHtml =
      /<\/?(?:html|body|section|div|h[1-6])\b/i.test(content) ||
      content.trimStart().startsWith("<!");

    const baseMeta = {
      ...doc.metadata,
      documentIndex: docIndex,
    };

    if (looksLikeHtml) {
      const chunks = await chunkHtmlDocument(content, baseMeta);
      processedDocs.push(...chunks);
    } else {
      // Plain-text fallback
      const normalized = normalizeText(content);
      const pieces = await splitOversized(normalized, HARD_MAX);
      pieces.forEach((text, i) => {
        if (!isMeaningfulChunk(text)) return;
        processedDocs.push(
          new Document({
            pageContent: text,
            metadata: {
              ...baseMeta,
              chunkIndex: i,
              chunkLength: text.length,
              sectionTitle: "",
              itemTitle: "",
              breadcrumb: "",
              contentType: "general",
              sectionLevel: 0,
              source: doc.metadata.source || doc.metadata.url || "unknown",
            },
          })
        );
      });
    }
  }

  // Fix totalChunksInDocument across all docs
  const total = processedDocs.length;
  processedDocs.forEach((d, i) => {
    d.metadata.chunkIndex = i;
    d.metadata.chunkInDocument = i + 1;
    d.metadata.totalChunksInDocument = total;
  });

  console.log(`\n=== HTML DOM-Aware Chunking Results ===`);
  console.log(`Input documents: ${documents.length}`);
  console.log(`Total chunks created: ${processedDocs.length}`);
  if (processedDocs.length > 0) {
    const lengths = processedDocs.map((c) => c.pageContent.length);
    console.log(
      `Average chunk size: ${Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)} characters`
    );
    console.log(
      `Chunk size range: ${Math.min(...lengths)} - ${Math.max(...lengths)} characters`
    );
  }

  const contentTypeCounts = processedDocs.reduce(
    (acc, chunk) => {
      const type = (chunk.metadata.contentType as string) || "general";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  console.log(`Content type distribution:`, contentTypeCounts);

  console.log(`\n=== Chunk Inventory ===`);
  processedDocs.forEach((chunk, i) => {
    const bc = chunk.metadata.breadcrumb || chunk.metadata.sectionTitle || "(untitled)";
    const type = chunk.metadata.contentType || "general";
    console.log(
      `${String(i + 1).padStart(3, " ")}. [${type}] ${bc} (${chunk.pageContent.length} chars)`
    );
  });

  return processedDocs;
};
