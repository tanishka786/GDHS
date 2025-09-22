'use client';

import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('markdown-content', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        // Headers
        h1: ({ children }) => (
          <h1 className="text-lg font-bold text-foreground mb-3 mt-4 first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold text-foreground mb-2 mt-3 first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-medium text-foreground mb-2 mt-3 first:mt-0">
            {children}
          </h3>
        ),
        
        // Paragraphs
        p: ({ children }) => (
          <p className="text-sm leading-relaxed mb-4 last:mb-0 text-foreground/90">
            {children}
          </p>
        ),
        
        // Lists
        ul: ({ children }) => (
          <ul className="space-y-2 mb-4 pl-0">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-2 mb-4 pl-4">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="text-sm text-foreground/90 leading-relaxed flex items-start gap-2">
            <span className="flex-1">{children}</span>
          </li>
        ),
        
        // Strong/Bold text
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">
            {children}
          </strong>
        ),
        
        // Emphasis/Italic text
        em: ({ children }) => (
          <em className="italic text-foreground/80">
            {children}
          </em>
        ),
        
        // Code
        code: ({ children, ...props }) => (
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground border" {...props}>
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto border mb-4">
            {children}
          </pre>
        ),
        
        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary/30 pl-4 py-2 bg-muted/30 rounded-r-lg mb-3 italic">
            <div className="text-sm text-foreground/80">{children}</div>
          </blockquote>
        ),
        
        // Links
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
          >
            {children}
          </a>
        ),
        
        // Tables
        table: ({ children }) => (
          <div className="overflow-x-auto mb-3">
            <table className="min-w-full border border-border rounded-lg">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted/50">{children}</thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-border">{children}</tbody>
        ),
        tr: ({ children }) => (
          <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left text-xs font-medium text-foreground border-r border-border last:border-r-0">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-xs text-foreground/80 border-r border-border last:border-r-0">
            {children}
          </td>
        ),
        
        // Horizontal rule
        hr: () => (
          <hr className="border-t border-border my-4" />
        ),
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}