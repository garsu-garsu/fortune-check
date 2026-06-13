import { TossAds } from "@apps-in-toss/web-framework";
import { useEffect, useRef, useState } from "react";

import { EVENT, track } from "../lib/analytics";
import { AD_GROUP_ID_BANNER } from "../lib/env";

/** 배너 광고 — 한 화면에 1개만 (탭/메인 화면 하단). */
export function BannerAd({ slot }: { slot?: string }) {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = targetRef.current;
    if (AD_GROUP_ID_BANNER === "" || target == null) return;
    let detach: (() => void) | undefined;
    try {
      if (!TossAds.attachBanner.isSupported()) return;
      try {
        if (TossAds.initialize.isSupported()) TossAds.initialize({});
      } catch {
        /* noop */
      }
      const { destroy } = TossAds.attachBanner(AD_GROUP_ID_BANNER, target, {
        theme: "auto",
        variant: "card",
        callbacks: {
          onAdRendered: () => {
            setVisible(true);
            track(EVENT.adBannerImpression, { slot: slot ?? "" }, "impression");
          },
          onAdFailedToRender: (p) => {
            console.error(p.error);
            setVisible(false);
          },
          onNoFill: () => setVisible(false),
        },
      });
      detach = destroy;
    } catch (err) {
      console.error(err);
    }
    return () => {
      try {
        detach?.();
      } catch {
        /* noop */
      }
    };
  }, [slot]);

  if (AD_GROUP_ID_BANNER === "") return null;
  return (
    <div
      ref={targetRef}
      style={{ minHeight: visible ? undefined : 0, overflow: "hidden" }}
    />
  );
}
