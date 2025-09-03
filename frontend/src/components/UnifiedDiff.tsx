import React, { useMemo } from "react";
import { diffLines } from "diff";

export type Granularity = "line" | "word" | "char";

export interface UnifiedDiffTextProps {
  truth: string;
  generated: string;
  granularity?: Granularity;
  ignoreCase?: boolean;
  ignoreWhitespace?: boolean;
  showControls?: boolean;
  showLegend?: boolean;
  className?: string;
  whiteSpace?: React.CSSProperties["whiteSpace"];
}

const baseSpan: React.CSSProperties = { padding: "0 2px", borderRadius: "2px" };
const addSpan: React.CSSProperties = { backgroundColor: "#d1fae5", color: "#000000" };
const remSpan: React.CSSProperties = { backgroundColor: "#fee2e2", color: "#000000", textDecoration: "line-through" };
const equalSpan: React.CSSProperties = { color: "#000000" };

function addSentenceNewlines(text: string): string {
  // Add newlines after sentence endings followed by space
  // This handles: period + space, question mark + space, exclamation mark + space
  // Add newlines after sentence endings and also split on 2+ spaces
  return text
    .replace(/([.!?])\s+/g, '$1\n')         // sentence endings
    .replace(/ {2,}/g, '\n');               // 2 or more spaces
}

function computeDiff(
  a: string,
  b: string
) {
  // Preprocess both texts to add newlines after sentences
  const processedA = addSentenceNewlines(a);
  const processedB = addSentenceNewlines(b);
  
  return diffLines(processedA, processedB);
}

export default function UnifiedDiffText({
  truth,
  generated,
  showLegend = true,
  className,
  whiteSpace = "pre-wrap",
}: UnifiedDiffTextProps) {
  const parts = useMemo(() => computeDiff(truth, generated), [truth, generated]);

  return (
    <div style={{ border: "1px solid #ccc", borderRadius: "8px", boxShadow: "2px 2px 5px rgba(0,0,0,0.1)", ... (className ? {} : {}) }}>
      {showLegend && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px", fontSize: "0.8em", color: "#000000" }}>
          <span style={{ ...baseSpan, ...addSpan }}> additions</span>
          <span style={{ ...baseSpan, ...remSpan }}> deletions</span>
          <span style={{ ...baseSpan, ...equalSpan, border: "1px solid #ccc" }}> unchanged</span>
        </div>
      )}

      <div style={{ padding: "12px" }}>
        <pre style={{ marginTop: "8px", fontSize: "0.9em", fontFamily: "monospace", lineHeight: "1.5", whiteSpace, color: "#000000" }}>
          {parts.map((p, i) => (
            <span
              key={i}
              style={{
                ...baseSpan,
                ...(p.added ? addSpan : p.removed ? remSpan : equalSpan)
              }}
            >
              {p.value}
            </span>
          ))}
        </pre>
      </div>
    </div>
  );
}
