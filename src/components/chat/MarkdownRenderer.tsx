"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { CopyButton } from "./CopyButton";
import type { Components } from "react-markdown";

const components: Components = {
  pre({ children }) {
    return (
      <div className="group relative my-2">
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          <CopyButton
            text={
              // Extract text from children
              extractText(children)
            }
          />
        </div>
        <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-4 text-sm dark:bg-zinc-800">
          {children}
        </pre>
      </div>
    );
  },
  code({ className, children, ...props }) {
    const isInline = !className;
    if (isInline) {
      return (
        <code
          className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-800"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  table({ children }) {
    return (
      <div className="my-2 overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          {children}
        </table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className="border border-zinc-300 bg-zinc-50 px-3 py-2 text-left font-medium dark:border-zinc-600 dark:bg-zinc-800">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="border border-zinc-300 px-3 py-2 dark:border-zinc-600">
        {children}
      </td>
    );
  },
};

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    const el = node as React.ReactElement<{ children?: React.ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm prose-zinc max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
