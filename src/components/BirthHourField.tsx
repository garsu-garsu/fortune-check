import { Paragraph } from "@toss/tds-mobile";

import { BIRTH_HOUR_SLOTS, birthHourSlotOf } from "../data/saju";
import { palette } from "../theme";

/**
 * 태어난 시간 — 시계 입력 대신 12시진 중에서 골라요.
 * 대부분 "새벽 3시쯤"까지만 기억해서, 분 단위를 물으면 아예 안 넣고 넘어가요.
 * value/onChange 는 "HH:MM"(모르면 "") 이라 기존 저장 형식 그대로예요.
 */
export function BirthHourField({
  value,
  onChange,
}: {
  value: string;
  onChange: (time: string) => void;
}) {
  // 예전에 시계로 넣은 값(03:20 같은)도 그 시진 칸이 켜져 보여야 해요.
  const current = birthHourSlotOf(value);

  return (
    <>
      <label style={labelStyle}>태어난 시간 (모르면 안 골라도 돼요)</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {BIRTH_HOUR_SLOTS.map((slot) => {
          const on = current?.time === slot.time;
          return (
            <button
              key={slot.time}
              type="button"
              onClick={() => onChange(on ? "" : slot.time)}
              style={{
                height: 52,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                padding: 0,
                borderRadius: 12,
                cursor: "pointer",
                border: `1px solid ${on ? palette.primary : palette.line}`,
                background: on ? palette.primary : "#FBFAFF",
                color: on ? palette.white : palette.ink,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700 }}>{slot.name}</span>
              <span style={{ fontSize: 12, opacity: on ? 0.9 : 0.7 }}>{slot.range}</span>
            </button>
          );
        })}
      </div>
      <Paragraph typography="t6" color={palette.sub} style={{ marginTop: 8, lineHeight: 1.5 }}>
        시각은 서울 기준 진태양시(약 32분)를 반영한 거라 딱 떨어지지 않아요. 자시는
        자정 앞뒤로 날짜가 달라져서 두 칸으로 나눠뒀어요.
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
