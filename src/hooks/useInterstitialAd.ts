import { loadFullScreenAd, showFullScreenAd } from "@apps-in-toss/web-framework";
import { useCallback, useEffect, useRef, useState } from "react";

import { EVENT, track } from "../lib/analytics";
import { AD_GROUP_ID_INTERSTITIAL } from "../lib/env";

let callCount = 0; // 모듈 스코프 → 리마운트 사이 유지

/** N번째 전환마다 1번 전면. 미설정/미로드/차례 아님 → 즉시 통과. */
export function useInterstitialAd(frequency = 3) {
  const [ready, setReady] = useState(false);
  const supportedRef = useRef(false);
  const unloadRef = useRef<(() => void) | null>(null);

  const load = useCallback(() => {
    if (AD_GROUP_ID_INTERSTITIAL === "") return;
    try {
      if (!loadFullScreenAd.isSupported()) return;
      supportedRef.current = true;
      unloadRef.current = loadFullScreenAd({
        options: { adGroupId: AD_GROUP_ID_INTERSTITIAL },
        onEvent: (e) => {
          if (e.type === "loaded") setReady(true);
        },
        onError: (err) => console.error(err),
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    load();
    return () => unloadRef.current?.();
  }, [load]);

  const maybeShow = useCallback(
    (onContinue: () => void, context?: string) => {
      callCount += 1;
      const isTurn = frequency > 0 && callCount % frequency === 0;
      if (
        AD_GROUP_ID_INTERSTITIAL === "" ||
        !supportedRef.current ||
        !ready ||
        !isTurn
      ) {
        onContinue();
        return;
      }
      let done = false;
      const once = () => {
        if (!done) {
          done = true;
          onContinue();
        }
      };
      try {
        showFullScreenAd({
          options: { adGroupId: AD_GROUP_ID_INTERSTITIAL },
          onEvent: (e) => {
            if (e.type === "dismissed") {
              track(EVENT.adInterstitial, { context: context ?? "" });
              setReady(false);
              load();
              once();
            } else if (e.type === "failedToShow") {
              setReady(false);
              load();
              once();
            }
          },
          onError: (err) => {
            console.error(err);
            setReady(false);
            load();
            once();
          },
        });
      } catch (err) {
        console.error(err);
        once();
      }
    },
    [ready, frequency, load],
  );

  return { maybeShow };
}
