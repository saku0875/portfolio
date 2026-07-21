type Props = {
  text: string;
  anim?: string;
  base?: string;
  className?: string;
};

export default function SplitText({ text, anim = "", base = "0s", className = "" }: Props) {
  return (
    <span
      className={`${anim} ${className}`}
      style={{ "--base": base } as React.CSSProperties}
    >
      {[...text].map((char, i) => (
        <span
          key={i}
          className="char"
          data-char={char}
          style={{ "--i": i } as React.CSSProperties}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
}