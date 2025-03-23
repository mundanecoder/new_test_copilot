"use client";

import React from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Element } from "hast";

interface CustomMarkdownProps {
  content: string;
  className?: string;
}

interface ListItemComponentProps {
  children?: React.ReactNode;
  className?: string;
  ordered?: boolean;
  index?: number;
  checked?: boolean | null;
}

// Define more specific prop types for our components
interface ComponentBaseProps {
  children?: React.ReactNode;
  className?: string;
}

interface CodeProps extends ComponentBaseProps {
  inline?: boolean;
}

interface ListProps extends ComponentBaseProps {
  ordered?: boolean;
  node?: Element;
}

const CustomMarkdown: React.FC<CustomMarkdownProps> = ({
  content,
  className = "",
}) => {
  const markdownComponents: Partial<Components> = {
    h1: ({ children }) => (
      <h1 className="text-3xl font-bold mb-4 text-black">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl font-semibold mb-3 text-black">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-medium mb-2 text-black">{children}</h3>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto my-4">
        <table className="w-full border-collapse bg-white rounded-lg shadow-sm border border-black">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-gray-200">{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => <tr>{children}</tr>,
    th: ({ children }) => (
      <th className="px-4 py-2 bg-gray-200 font-semibold text-left border-b border-black">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2 border-b border-black">{children}</td>
    ),
    p: ({ children, node, ...props }) => {
      const parentType = (node as any)?.parent?.type;
      if (parentType === "listItem") {
        return (
          <span className="inline" {...props}>
            {children}
          </span>
        );
      }
      return (
        <p className="mb-4 text-lg text-black" {...props}>
          {children}
        </p>
      );
    },
    blockquote: ({ children }) => (
      <blockquote className="pl-4 border-l-4 border-black italic my-4 text-black">
        {children}
      </blockquote>
    ),
    code: ({ inline, className, children }: CodeProps) => {
      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : "";

      if (inline) {
        return (
          <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono text-black">
            {children}
          </code>
        );
      }

      return (
        <pre className="overflow-x-auto my-4">
          <code
            className={`block bg-gray-100 p-4 rounded-lg text-sm font-mono text-black ${
              language ? `language-${language}` : ""
            }`}
          >
            {children}
          </code>
        </pre>
      );
    },
    br: () => <br className="my-2" />,
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        {children}
      </a>
    ),
    ul: ({ children, ordered }: ListProps) => (
      <ul className="list-disc space-y-2 ml-4 font-semibold text-black">
        {children}
      </ul>
    ),
    ol: ({ children }: ListProps) => (
      <ol className="list-decimal list-outside pl-8 space-y-2 text-black">
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => {
      // Check if the content starts with a number followed by a period
      const hasNumber = React.Children.toArray(children)[0]
        ?.toString()
        .match(/^\d+\./);

      // If it's a manually numbered item, remove the number
      if (hasNumber) {
        const content = React.Children.toArray(children)[0]
          ?.toString()
          .replace(/^\d+\.\s*/, "");
        return <li {...props}>{content}</li>;
      }

      // For regular list items, just render them normally
      return <li {...props}>{children}</li>;
    },
    img: ({ src, alt }) => (
      <img
        src={src}
        alt={alt}
        className="max-w-full h-auto rounded-lg my-4 border border-black"
        loading="lazy"
      />
    ),
    hr: () => <hr className="my-8 border-black" />,
    strong: ({ children }) => (
      <strong className="font-semibold inline text-black">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="italic inline text-black">{children}</em>
    ),
    del: ({ children }) => (
      <del className="line-through text-gray-500">{children}</del>
    ),
  };

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
        rehypePlugins={[]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default CustomMarkdown;
