import { Paragraph } from "@toss/tds-mobile";

import { BLURRED, splitTeaser } from "../lib/teaser";
import { palette } from "../theme";

/**
 * 잠긴 콘텐츠를 앞 한 줄만 보여주고 나머지는 흐리게 처리해요.
 * 아무것도 안 보여주면 "뭐가 있는지도 모르는 것"이라 광고를 볼 이유가 없어요.
 */

export function Teaser({
  text,
  maxHeight = 132,
}: {
  text: string;
  maxHeight?: number;
}) {
  const [head, tail] = splitTeaser(text);
  const fade = "linear-gradient(#000 50%, transparent)";
  return (
    <div
      style={{
        marginTop: 8,
        maxHeight,
        overflow: "hidden",
        WebkitMaskImage: fade,
        maskImage: fade,
      }}
    >
      <Paragraph
        typography="t6"
        color={palette.ink}
        style={{ lineHeight: 1.7, whiteSpace: "pre-line" }}
      >
        {head}
        <span style={BLURRED}>{tail}</span>
      </Paragraph>
    </div>
  );
}
