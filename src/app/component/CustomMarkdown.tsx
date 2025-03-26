"use client";

import React from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import Image from "next/image";

interface CustomMarkdownProps {
  content: string;
  className?: string;
}

const CustomMarkdown: React.FC<CustomMarkdownProps> = ({
  content,
  className = "",
}) => {
  const markdownComponents: Partial<Components> = {
    h1: ({ children }) => (
      <h1 className="text-4xl font-bold mt-2 mb-4 text-black border-b pb-2 border-gray-300">
        {children}
      </h1>
    ),

    h2: ({ children }) => (
      <h2 className="text-3xl font-semibold my-4 text-black border-b pb-2 border-gray-300">
        {children}
      </h2>
    ),

    h3: ({ children }) => (
      <h3 className="text-2xl font-medium mb-8 text-black">{children}</h3>
    ),

    table: ({ children }) => (
      <div className="overflow-x-auto my-6">
        <table className="w-full border-collapse bg-white mt-4 mb-2 rounded-lg shadow-md border border-gray-300">
          {children}
        </table>
      </div>
    ),

    thead: ({ children }) => (
      <thead className="bg-gray-200 mb-3 font-semibold">{children}</thead>
    ),

    tbody: ({ children }) => <tbody>{children}</tbody>,

    tr: ({ children }) => (
      <tr className="border-b border-gray-300">{children}</tr>
    ),

    th: ({ children }) => (
      <th className="px-6 py-3 text-left border-b mb-2 border-gray-400 bg-gray-200">
        {children}
      </th>
    ),

    td: ({ children }) => (
      <td className="px-6 py-3 border-b border-gray-300">{children}</td>
    ),

    p: ({ children }) => (
      <p className="mb-5 text-lg  text-gray-900 leading-relaxed">{children}</p>
    ),

    blockquote: ({ children }) => (
      <blockquote className="pl-6 border-l-4 mb-2 border-gray-500 italic text-gray-800 bg-gray-100 py-2 px-4 rounded-md my-6">
        {children}
      </blockquote>
    ),

    code: ({ className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || "");
      // TypeScript doesn't recognize 'inline' property, so we need to type it properly
      const isInline = "inline" in props;
      // Create a new props object without the inline property
      const newProps = { ...props };
      if ("inline" in newProps) {
        delete (newProps as { inline?: boolean }).inline;
      }
      return isInline ? (
        <code
          className="px-2 py-1 bg-gray-100 text-black rounded font-mono text-sm"
          {...newProps}
        >
          {children}
        </code>
      ) : (
        <pre className="overflow-x-auto my-6 rounded-lg">
          <SyntaxHighlighter
            language={match ? match[1] : ""}
            style={oneDark}
            PreTag="div"
            customStyle={{ padding: "1rem", borderRadius: "0.5rem" }}
            {...props}
          >
            {String(children).trim()}
          </SyntaxHighlighter>
        </pre>
      );
    },

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

    ul: ({ children }) => (
      <ul className="list-disc ml-6 space-y-2 text-black">{children}</ul>
    ),

    ol: ({ children }) => (
      <ol className="list-decimal ml-6 space-y-2 text-black">{children}</ol>
    ),

    li: ({ children }) => (
      <li className="text-gray-900 leading-relaxed">{children}</li>
    ),

    img: ({ src, alt }) => (
      <Image
        src={src || ""}
        alt={alt || ""}
        className="max-w-full h-auto rounded-lg my-6 border border-gray-400 shadow-md"
        loading="lazy"
        width={600}
        height={400}
      />
    ),

    hr: () => <hr className="my-8 border-gray-400" />,

    strong: ({ children }) => (
      <strong className="font-semibold text-black">{children}</strong>
    ),

    em: ({ children }) => <em className="italic text-black">{children}</em>,

    del: ({ children }) => (
      <del className="line-through text-gray-500">{children}</del>
    ),
  };

  return (
    <div className={`prose prose-lg ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default CustomMarkdown;
