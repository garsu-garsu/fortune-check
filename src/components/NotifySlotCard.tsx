import { useState } from "react";

import { Button, Paragraph, useToast } from "@toss/tds-mobile";

import { requestNotifyConsent, type NotifySlotCode } from "../data/notify";
import { EVENT, track } from "../lib/analytics";
import { palette } from "../theme";
import { Card } from "./ScreenLayout";

interface Slot {
  code: NotifySlotCode;
  label: string;
}

interface Props {
  title: string;
  slots: readonly Slot[];
  agreedCode: string | null;
  onAgreed: (code: string) => void;
  /** 어느 화면에서 눌렀는지 — 분석용. */
  where: string;
}

/** 알림 시간 선택 카드 — 아침 운세 / 밤 검증 알림에 공통으로 써요. */
export function NotifySlotCard({ title, slots, agreedCode, onAgreed, where }: Props) {
  const { openToast } = useToast();
  const [busy, setBusy] = useState(false);

  const onPick = async (code: NotifySlotCode) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await requestNotifyConsent(code);
      // 동의창 자체가 안 뜬 경우예요(브라우저이거나 발송 코드가 콘솔에 없을 때).
      // 여기서 조용히 넘어가면 눌러도 아무 일이 없는 것처럼 보여요.
      if (result == null) {
        openToast("지금은 알림을 설정할 수 없어요.");
        return;
      }
      track(EVENT.notifyConsent, { result, where });
      if (result === "agreementRejected") return;
      onAgreed(code);
      openToast(
        result === "alreadyAgreed" ? "이미 알림을 받고 있어요." : "이제 그 시간에 알려드릴게요.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ marginTop: 12 }}>
      <Paragraph typography="t6" fontWeight="bold" color={palette.ink}>
        {title}
      </Paragraph>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {slots.map((slot) => (
          <Button
            key={slot.code}
            size="large"
            display="block"
            variant={agreedCode === slot.code ? "fill" : "weak"}
            color={agreedCode === slot.code ? "primary" : "dark"}
            onClick={() => void onPick(slot.code)}
          >
            {slot.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}
