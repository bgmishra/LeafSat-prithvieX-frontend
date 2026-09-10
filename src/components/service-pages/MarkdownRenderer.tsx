import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

type MarkdownRendererProps = {
  content?: string | null;
};

const youtubeLinePattern = /^\s*::youtube\s+(https?:\/\/\S+)\s*$/i;

function youtubeEmbedUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./, "");
    let videoId = "";

    if (hostname === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v") || "";
      } else if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/").filter(Boolean)[1] || "";
      }
    }

    if (!/^[A-Za-z0-9_-]{6,}$/.test(videoId)) {
      return null;
    }

    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {
    return null;
  }
}

function splitMarkdownContent(content: string) {
  const blocks: Array<{ content: string; type: "markdown" } | { embedUrl: string; type: "youtube" }> = [];
  const lines = content.split("\n");
  let markdownLines: string[] = [];

  function flushMarkdown() {
    const markdown = markdownLines.join("\n").trim();
    if (markdown) {
      blocks.push({ content: markdown, type: "markdown" });
    }
    markdownLines = [];
  }

  lines.forEach((line) => {
    const match = line.match(youtubeLinePattern);
    const embedUrl = match ? youtubeEmbedUrl(match[1]) : null;

    if (embedUrl) {
      flushMarkdown();
      blocks.push({ embedUrl, type: "youtube" });
      return;
    }

    markdownLines.push(line);
  });

  flushMarkdown();
  return blocks;
}

function YouTubeEmbed({ embedUrl }: { embedUrl: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
      <iframe
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="aspect-video w-full"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        src={embedUrl}
        title="YouTube video player"
      />
    </div>
  );
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content?.trim()) {
    return null;
  }

  const blocks = splitMarkdownContent(content);

  return (
    <div className="space-y-5 text-slate-700">
      {blocks.map((block, index) =>
        block.type === "youtube" ? (
          <YouTubeEmbed embedUrl={block.embedUrl} key={`${block.embedUrl}-${index}`} />
        ) : (
          <ReactMarkdown
            components={{
              a: ({ children, ...props }) => (
                <a
                  {...props}
                  className="font-semibold text-teal-700 underline-offset-4 hover:underline"
                  rel="noreferrer"
                  target={props.href?.startsWith("http") ? "_blank" : undefined}
                >
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-teal-500 bg-teal-50 px-4 py-3 text-slate-700">
                  {children}
                </blockquote>
              ),
              code: ({ children, className }) => (
                <code className={`${className || ""} rounded bg-slate-100 px-1.5 py-0.5 text-sm text-slate-900`}>
                  {children}
                </code>
              ),
              h1: ({ children }) => <h1 className="text-3xl font-bold tracking-tight text-slate-950">{children}</h1>,
              h2: ({ children }) => <h2 className="pt-4 text-2xl font-bold tracking-tight text-slate-950">{children}</h2>,
              h3: ({ children }) => <h3 className="pt-2 text-xl font-semibold text-slate-950">{children}</h3>,
              img: ({ alt, src }) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={alt || ""} className="w-full rounded-lg border border-slate-200 object-cover" src={src || ""} />
              ),
              li: ({ children }) => <li className="leading-7">{children}</li>,
              ol: ({ children }) => <ol className="list-decimal space-y-2 pl-6">{children}</ol>,
              p: ({ children }) => <p className="leading-7">{children}</p>,
              pre: ({ children }) => (
                <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-50">{children}</pre>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">{children}</table>
                </div>
              ),
              td: ({ children }) => <td className="border-t border-slate-200 px-4 py-3 align-top">{children}</td>,
              th: ({ children }) => (
                <th className="bg-slate-50 px-4 py-3 text-left font-semibold text-slate-950">{children}</th>
              ),
              ul: ({ children }) => <ul className="list-disc space-y-2 pl-6">{children}</ul>,
            }}
            key={`${block.content}-${index}`}
            rehypePlugins={[rehypeSanitize]}
            remarkPlugins={[remarkGfm]}
          >
            {block.content}
          </ReactMarkdown>
        ),
      )}
    </div>
  );
}
