import { clamp } from "./config.js";
import { updateDanger } from "./danger.js";
import { advanceLaneCombat, marchSquad } from "./lane-combat.js";

export { casualtyRates } from "./lane-combat.js";

export function updateArmy(
  state,
  dt,
  sprinkle,
  end,
  notify = () => {},
  onEffect = null,
) {
  const { combat, battlefield, objective } = state.level;
  for (let j = state.squads.length - 1; j >= 0; j--) {
    const q = state.squads[j];
    if (marchSquad(q, state.front, combat, battlefield.marchSpeed, dt)) {
      state.blueTotal += q.count;
      state.squads.splice(j, 1);
      onEffect?.("arrival", state.t, q, state.front);
      sprinkle(
        q.x + (210 - q.x) * 0.8,
        state.front + combat.arrivalOffset,
        "#64bbff",
        4,
      );
      if (q.mult === 999 && !state.finalActivated) {
        state.finalActivated = true;
        notify("×999 REINFORCEMENTS ARRIVED!", 3);
      }
    }
  }

  const previousFront = state.front;
  const { redLost, blueLost } = advanceLaneCombat(state, combat, objective, state.t, dt);
  if (!state.redEntryOpen && state.redTotal === 0) {
    end(true);
    return;
  }
  if (state.front >= objective.castleFront) {
    end(false);
    return;
  }

  state.redRecentLoss += redLost;
  state.blueRecentLoss += blueLost;
  state.nextCombatEffect -= dt;
  if (state.nextCombatEffect <= 0) {
    const half = clamp(24 + Math.abs(state.front - 258) * 0.3, 24, 110);
    const x = 210 + Math.sin(state.t * 13) * half * 0.7;
    impact(sprinkle, state.redRecentLoss, x, state.front - 4, "#df544b");
    impact(sprinkle, state.blueRecentLoss, 420 - x, state.front + 8, "#65baff");
    if (state.redRecentLoss > 0 || state.blueRecentLoss > 0) {
      onEffect?.(
        "clash",
        state.t,
        x,
        state.front,
        state.redRecentLoss,
        state.blueRecentLoss,
      );
    }
    state.redRecentLoss = 0;
    state.blueRecentLoss = 0;
    state.nextCombatEffect += combat.combatEffectInterval;
  }

  if (dt > 0) updateDanger(state, dt, blueLost / dt, (state.front - previousFront) / dt);
}

function impact(sprinkle, loss, x, y, color) {
  if (loss > 0) {
    sprinkle(x, y, color, Math.min(4, Math.ceil(Math.sqrt(loss) / 3)));
  }
}
