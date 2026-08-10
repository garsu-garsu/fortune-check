import { useState } from "react";

import { Paragraph } from "@toss/tds-mobile";

import { kstDate } from "../lib/kst";
import { birthLabel, formatBirthDigits, parseBirthDigits } from "../lib/birthdate";
import { palette } from "../theme";

/**
 * 생년월일 입력 — 달력 대신 숫자 8자리.
 * onChange 는 칠 때마다 불려요. 완성 전이거나 말이 안 되는 날짜면 ""를 줘요.
 */
export function BirthDateField({
  value,
  onChange,
  label = "생년월일",
}: {
  value: string;
  onChange: (iso: string) => void;
  label?: string;
}) {
  const [digits, setDigits] = useState(value.replace(/-/g, ""));
  const today = kstDate();
  const { iso, error } = parseBirthDigits(digits, today);

  return (
    <>
      <label style={labelStyle}>{label}</label>
      <input
        type="text"
        inputMode="numeric"
        value={formatBirthDigits(digits)}
        placeholder="예: 19700315"
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, "").slice(0, 8);
          setDigits(next);
          onChange(parseBirthDigits(next, today).iso);
        }}
        style={{
          ...inputStyle,
          borderColor: error ? palette.bad : palette.line,
          // 숫자를 크게 — 다 치고 나서 눈으로 한 번 더 확인해요.
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: 1,
        }}
      />
      <Paragraph
        typography="t6"
        color={error ? palette.bad : palette.sub}
        style={{ marginTop: 6, lineHeight: 1.5 }}
      >
        {error ??
          (iso ? birthLabel(iso) : "태어난 해·월·일을 숫자 8자리로 붙여서 넣어주세요.")}
      </Paragraph>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: palette.sub,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  height: 52,
  padding: "12px 14px",
  borderRadius: 12,
  border: `1px solid ${palette.line}`,
  color: palette.ink,
  background: "#FBFAFF",
  outline: "none",
};
