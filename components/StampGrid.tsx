import { Teabag } from "./Teabag";

/** Shows progress towards the next free drink. `balance` can exceed `target` if a reward is waiting. */
export function StampGrid({ balance, target, popIndex }: { balance: number; target: number; popIndex?: number | null }) {
  const rewards = Math.floor(balance / target);
  const filled = rewards > 0 ? target : balance % target;
  return (
    <div className="stamps" role="img" aria-label={`${Math.min(balance, target)} of ${target} stamps`}>
      {Array.from({ length: target }, (_, i) => {
        const on = i < filled;
        const isReward = i === target - 1;
        return (
          <div key={i} className={`stamp${on ? " on" : ""}${isReward ? " reward" : ""}${popIndex === i ? " pop" : ""}`}>
            {on && !isReward ? <Teabag /> : isReward ? <span>FREE<br />DRINK</span> : i + 1}
          </div>
        );
      })}
    </div>
  );
}
