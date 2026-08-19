import { Text, View } from "react-native";

/**
 * Just enough Markdown for the drafted report: headings, bullets, bold, and
 * paragraphs. React Native has no dangerouslySetInnerHTML to fall back on, and
 * a full parser is more than this needs.
 */

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "bullet"; items: string[] }
  | { kind: "rule" }
  | { kind: "para"; text: string };

/** `---`, `***`, `___` — a thematic break, not body text. */
const HR_RE = /^\s*([-*_])\s*(?:\1\s*){2,}$/;

function parse(md: string): Block[] {
  const blocks: Block[] = [];
  const lines = md.replace(/\r\n/g, "\n").split("\n");

  let para: string[] = [];
  let bullets: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ kind: "para", text: para.join(" ").trim() });
      para = [];
    }
  };
  const flushBullets = () => {
    if (bullets.length) {
      blocks.push({ kind: "bullet", items: bullets });
      bullets = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushPara();
      flushBullets();
      continue;
    }

    // Checked before the bullet rule, which would otherwise swallow `---`.
    if (HR_RE.test(line)) {
      flushPara();
      flushBullets();
      blocks.push({ kind: "rule" });
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushPara();
      flushBullets();
      blocks.push({
        kind: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2].trim(),
      });
      continue;
    }

    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      flushPara();
      bullets.push(bullet[1].trim());
      continue;
    }

    flushBullets();
    para.push(line.trim());
  }

  flushPara();
  flushBullets();
  return blocks;
}

/** Splits on **bold** and renders the segments inline. */
function Inline({ text, className }: { text: string; className: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return (
    <>
      {parts.map((part, i) => {
        const bold = /^\*\*[^*]+\*\*$/.test(part);
        return (
          <Text
            key={i}
            className={bold ? `${className} font-sans-md text-navy` : className}
          >
            {bold ? part.slice(2, -2) : part}
          </Text>
        );
      })}
    </>
  );
}

export function Markdown({ source }: { source: string }) {
  const blocks = parse(source);

  return (
    <View className="gap-4">
      {blocks.map((block, i) => {
        if (block.kind === "heading") {
          const size = block.level === 1 ? 22 : block.level === 2 ? 18 : 16;
          return (
            <Text
              key={i}
              className="font-display text-navy"
              style={{
                fontSize: size,
                lineHeight: size * 1.25,
                letterSpacing: -size * 0.015,
                marginTop: i === 0 ? 0 : 8,
              }}
            >
              {block.text.replace(/\*\*/g, "")}
            </Text>
          );
        }

        if (block.kind === "rule") {
          return <View key={i} className="my-1 h-px w-full bg-rule-faint" />;
        }

        if (block.kind === "bullet") {
          return (
            <View key={i} className="gap-2">
              {block.items.map((item, j) => (
                <View key={j} className="flex-row gap-2.5">
                  <Text className="font-sans text-[15px] leading-[26px] text-periwinkle">
                    —
                  </Text>
                  <Text className="flex-1 font-sans text-[15px] leading-[26px] text-indigo">
                    <Inline
                      text={item}
                      className="font-sans text-[15px] leading-[26px] text-indigo"
                    />
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        return (
          <Text key={i} className="font-sans text-[15px] leading-[26px] text-indigo">
            <Inline
              text={block.text}
              className="font-sans text-[15px] leading-[26px] text-indigo"
            />
          </Text>
        );
      })}
    </View>
  );
}
